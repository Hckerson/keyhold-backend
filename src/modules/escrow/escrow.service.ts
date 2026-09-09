import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { sumDecimal, toNumber } from '@common/money';
import { EscrowRepo } from '@common/repos/escrow.repo';
import { TransactionRepo } from '@common/repos/transaction.repo';
import { PropertyRepo } from '@common/repos/property.repo';
import { StripeService } from '@common/services/payment/stripe.service';
import { EmailService } from '@common/services/email/email.service';
import { PDFService } from '@common/services/document/pdf.service';
import { CloudinaryService } from '@common/services/storage/cloudinary.service';
import {
    EscrowStatus,
    PropertyStatus,
    TransactionStatus,
    UserRole,
} from '@generated/prisma/enums';
import { SettingsService } from '@modules/settings/settings.service';
import { DbTransaction } from '@common/database/db-transaction';
import { LIVE_TRANSACTION_STATUSES } from '@common/enums';
import { QueryEscrowDto, RefundEscrowDto } from './dto';

const DEFAULT_LIMIT = 20;
const DEFAULT_INSPECTION_DAYS = 3;
const ESCROW_HOLD_SETTING = 'escrowHoldDays';
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const UNKNOWN_ADDRESS = 'Address not specified';

const TRANSACTION_INCLUDE = {
    transaction: {
        include: {
            buyer: { select: { id: true, fullName: true, email: true } },
            seller: { select: { id: true, fullName: true, email: true } },
            property: {
                select: {
                    id: true,
                    title: true,
                    address: true,
                    locality: true,
                    price: true,
                },
            },
        },
    },
} satisfies Prisma.EscrowInclude;

@Injectable()
export class EscrowService {
    private readonly logger = new Logger(EscrowService.name);

    constructor(
        private escrowRepo: EscrowRepo,
        private transactionRepo: TransactionRepo,
        private propertyRepo: PropertyRepo,
        private stripeService: StripeService,
        private emailService: EmailService,
        private pdfService: PDFService,
        private cloudinaryService: CloudinaryService,
        private settingsService: SettingsService,
        private dbTransaction: DbTransaction,
    ) {}

    private async inspectionDays() {
        const configured =
            await this.settingsService.findValue(ESCROW_HOLD_SETTING);
        const days = Number(configured);
        return Number.isFinite(days) && days > 0
            ? days
            : DEFAULT_INSPECTION_DAYS;
    }

    async hold(transactionId: string, amount: Prisma.Decimal) {
        const existing = await this.transactionRepo.findUnique({
            where: { id: transactionId },
            include: { escrowHold: true },
        });
        if (existing?.escrowHold) return existing.escrowHold;

        const days = await this.inspectionDays();
        const inspectionEndDate = new Date(Date.now() + days * MS_PER_DAY);

        const escrow = await this.escrowRepo.create({
            data: { amount, inspectionEndDate, status: EscrowStatus.HELD },
        });

        await this.transactionRepo.update({
            where: { id: transactionId },
            data: {
                escrowHoldId: escrow.id,
                status: TransactionStatus.IN_PROGRESS,
            },
        });

        return escrow;
    }

    async findAll(query: QueryEscrowDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? DEFAULT_LIMIT;
        const where: Prisma.EscrowWhereInput = { status: query.status };

        const [items, total] = await Promise.all([
            this.escrowRepo.findMany({
                where,
                include: TRANSACTION_INCLUDE,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.escrowRepo.count({ where }),
        ]);

        return {
            items,
            total,
            page,
            limit,
            pageCount: Math.max(1, Math.ceil(total / limit)),
        };
    }

    async stages() {
        const statuses = [
            EscrowStatus.HELD,
            EscrowStatus.RELEASED,
            EscrowStatus.REFUNDED,
            EscrowStatus.DISPUTED,
        ];

        const stages = await Promise.all(
            statuses.map(async (status) => {
                const rows = await this.escrowRepo.findMany({
                    where: { status },
                    select: { amount: true, createdAt: true },
                    orderBy: { createdAt: 'asc' },
                });

                return {
                    status,
                    count: rows.length,
                    amount: toNumber(sumDecimal(rows.map((row) => row.amount))),
                    oldestAt: rows[0]?.createdAt ?? null,
                };
            }),
        );

        return stages;
    }

    async findOne(id: string, actorId: string, actorRole: UserRole) {
        const escrow = await this.escrowRepo.findUnique({
            where: { id },
            include: TRANSACTION_INCLUDE,
        });
        if (!escrow) throw new NotFoundException('Escrow hold not found');

        const transaction = escrow.transaction;
        const isParty =
            transaction &&
            (transaction.buyerId === actorId ||
                transaction.sellerId === actorId);
        if (actorRole !== UserRole.ADMIN && !isParty) {
            throw new ForbiddenException('You cannot view this escrow hold');
        }

        return escrow;
    }

    async release(
        id: string,
        actorId: string,
        actorRole: UserRole,
        allowed: EscrowStatus[] = [EscrowStatus.HELD],
    ) {
        const escrow = await this.requireSettlable(id, allowed);
        const transaction = escrow.transaction;
        if (!transaction) {
            throw new BadRequestException(
                'This hold is not attached to a transaction',
            );
        }

        const isBuyer = transaction.buyerId === actorId;
        const isAdmin = actorRole === UserRole.ADMIN;
        const windowClosed = escrow.inspectionEndDate <= new Date();
        const isSellerAfterWindow =
            transaction.sellerId === actorId && windowClosed;

        if (!isBuyer && !isAdmin && !isSellerAfterWindow) {
            throw new ForbiddenException(
                'Only the buyer or an admin can release before the inspection window closes',
            );
        }

        const agreementPDF = this.pdfService.generatePurchaseAgreement({
            buyerName: transaction.buyer.fullName,
            buyerEmail: transaction.buyer.email,
            sellerName: transaction.seller.fullName,
            sellerEmail: transaction.seller.email,
            propertyTitle: transaction.property.title,
            propertyAddress: transaction.property.address ?? UNKNOWN_ADDRESS,
            purchasePrice: toNumber(transaction.finalPrice),
            terms: transaction.terms,
            date: new Date(),
        });

        const { url: agreementDocUrl } =
            await this.cloudinaryService.uploadDocument(
                agreementPDF,
                `agreement-${transaction.id}.pdf`,
            );

        const released = await this.dbTransaction.run(async () => {
            const claimed = await this.escrowRepo.updateMany({
                where: { id, status: { in: allowed } },
                data: {
                    status: EscrowStatus.RELEASED,
                    releasedAt: new Date(),
                },
            });
            if (claimed.count !== 1) {
                throw new BadRequestException(
                    'This hold has already been settled',
                );
            }

            await this.transactionRepo.update({
                where: { id: transaction.id },
                data: {
                    status: TransactionStatus.COMPLETED,
                    completedAt: new Date(),
                    agreementDocUrl,
                },
            });
            await this.propertyRepo.update({
                where: { id: transaction.propertyId },
                data: { status: PropertyStatus.SOLD },
            });

            return this.escrowRepo.findUnique({
                where: { id },
                include: TRANSACTION_INCLUDE,
            });
        });

        if (!released) throw new NotFoundException('Escrow hold not found');

        await this.notifySettlement(transaction);

        return { escrow: released, agreementUrl: agreementDocUrl };
    }

    async refund(
        id: string,
        refundDto: RefundEscrowDto,
        allowed: EscrowStatus[] = [EscrowStatus.HELD],
    ) {
        const escrow = await this.requireSettlable(id, allowed);
        const transaction = escrow.transaction;
        if (!transaction) {
            throw new BadRequestException(
                'This hold is not attached to a transaction',
            );
        }

        if (transaction.stripePaymentIntentId) {
            await this.stripeService.refundPayment(
                transaction.stripePaymentIntentId,
            );
        }

        const otherLive = await this.transactionRepo.findFirst({
            where: {
                propertyId: transaction.propertyId,
                id: { not: transaction.id },
                status: { in: [...LIVE_TRANSACTION_STATUSES] },
            },
        });

        const refunded = await this.dbTransaction.run(async () => {
            const claimed = await this.escrowRepo.updateMany({
                where: { id, status: { in: allowed } },
                data: {
                    status: EscrowStatus.REFUNDED,
                    refundedAt: new Date(),
                },
            });
            if (claimed.count !== 1) {
                throw new BadRequestException(
                    'This hold has already been settled',
                );
            }

            await this.transactionRepo.update({
                where: { id: transaction.id },
                data: { status: TransactionStatus.CANCELLED },
            });

            if (!otherLive) {
                await this.propertyRepo.update({
                    where: { id: transaction.propertyId },
                    data: { status: PropertyStatus.AVAILABLE },
                });
            }

            return this.escrowRepo.findUnique({
                where: { id },
                include: TRANSACTION_INCLUDE,
            });
        });

        if (!refunded) throw new NotFoundException('Escrow hold not found');

        return { escrow: refunded, reason: refundDto.reason };
    }

    async markDisputed(id: string) {
        const escrow = await this.escrowRepo.findUnique({ where: { id } });
        if (!escrow) throw new NotFoundException('Escrow hold not found');

        if (escrow.status !== EscrowStatus.HELD) {
            throw new BadRequestException('Only a held escrow can be disputed');
        }

        return this.escrowRepo.update({
            where: { id },
            data: { status: EscrowStatus.DISPUTED },
        });
    }

    async restoreHeld(id: string) {
        const escrow = await this.escrowRepo.findUnique({ where: { id } });
        if (!escrow) throw new NotFoundException('Escrow hold not found');
        if (escrow.status !== EscrowStatus.DISPUTED) return escrow;

        return this.escrowRepo.update({
            where: { id },
            data: { status: EscrowStatus.HELD },
        });
    }

    private async requireSettlable(id: string, allowed: EscrowStatus[]) {
        const escrow = await this.escrowRepo.findUnique({
            where: { id },
            include: TRANSACTION_INCLUDE,
        });
        if (!escrow) throw new NotFoundException('Escrow hold not found');

        if (!allowed.includes(escrow.status)) {
            throw new BadRequestException('This hold has already been settled');
        }

        return escrow;
    }

    private async notifySettlement(transaction: {
        buyer: { email: string };
        seller: { email: string };
        property: { title: string };
        finalPrice: Prisma.Decimal;
    }) {
        try {
            await this.emailService.sendTransactionCompletedEmail(
                transaction.buyer.email,
                transaction.property.title,
                toNumber(transaction.finalPrice),
            );

            await this.emailService.sendEmail({
                to: transaction.seller.email,
                subject: `Sale Completed: ${transaction.property.title}`,
                html: `
          <h2>Congratulations on the Sale!</h2>
          <p>Your property <strong>${transaction.property.title}</strong> has been sold.</p>
          <p><strong>Final Price: $${transaction.finalPrice.toLocaleString()}</strong></p>
          <p>The buyer should rate you based on their experience. Thank you for using our platform.</p>
        `,
            });
        } catch (error) {
            this.logger.error(
                `Failed to send settlement emails: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }
}
