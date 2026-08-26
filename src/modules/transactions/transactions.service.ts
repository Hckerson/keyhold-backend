import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { TransactionRepo } from '@common/repos/transaction.repo';
import { OfferRepo } from '@common/repos/offer.repo';
import { ConnectionRepo } from '@common/repos/connection.repo';
import { UserRepo } from '@common/repos/user.repo';
import { sumDecimal, toNumber } from '@common/money';
import { PropertyRepo } from '@common/repos/property.repo';
import { StripeService } from '@common/services/payment/stripe.service';
import {
    OfferStatus,
    PropertyStatus,
    TransactionStatus,
} from '@generated/prisma/enums';
import { EscrowService } from '@modules/escrow/escrow.service';
import { SettingsService } from '@modules/settings/settings.service';
import { CreateTransactionDto, QueryTransactionDto } from './dto';
import {
    CENTS_PER_UNIT,
    DEFAULT_CURRENCY,
    LIVE_TRANSACTION_STATUSES,
    SETTING_BASE_CURRENCY,
} from '@common/enums';

const DEFAULT_LIMIT = 20;

const ADMIN_INCLUDE = {
    buyer: { select: { id: true, fullName: true, email: true, avatar: true } },
    seller: { select: { id: true, fullName: true, email: true, avatar: true } },
    property: {
        select: {
            id: true,
            title: true,
            address: true,
            locality: true,
            price: true,
        },
    },
    escrowHold: true,
    dispute: { select: { id: true, title: true, status: true } },
} satisfies Prisma.TransactionInclude;

@Injectable()
export class TransactionsService {
    constructor(
        private transactionRepo: TransactionRepo,
        private offerRepo: OfferRepo,
        private connectionRepo: ConnectionRepo,
        private propertyRepo: PropertyRepo,
        private userRepo: UserRepo,
        private stripeService: StripeService,
        private escrowService: EscrowService,
        private settingsService: SettingsService,
    ) {}

    async initiateTransaction(userId: string, createDto: CreateTransactionDto) {
        const offer = await this.offerRepo.findUnique({
            where: { id: createDto.offerId },
            include: {
                connection: {
                    select: { id: true, buyerId: true, sellerId: true },
                },
                property: { select: { id: true, status: true } },
            },
        });
        if (!offer) throw new NotFoundException('Offer not found');

        if (offer.connection?.buyerId !== userId) {
            throw new ForbiddenException(
                'Only the buyer can initiate transaction',
            );
        }

        if (offer.status !== OfferStatus.ACCEPTED) {
            throw new BadRequestException(
                'Offer must be accepted to initiate transaction',
            );
        }

        if (offer.expiresAt <= new Date()) {
            throw new BadRequestException('This offer has expired');
        }

        if (
            offer.property.status !== PropertyStatus.AVAILABLE &&
            offer.property.status !== PropertyStatus.PENDING
        ) {
            throw new BadRequestException(
                'This listing is not available for purchase',
            );
        }

        const buyer = await this.userRepo.findUnique({
            where: { id: userId },
            select: { kycVerified: true },
        });
        if (!buyer?.kycVerified) {
            throw new ForbiddenException(
                'Identity verification is required before payment',
            );
        }

        const live = await this.transactionRepo.findFirst({
            where: {
                propertyId: offer.property.id,
                status: { in: [...LIVE_TRANSACTION_STATUSES] },
            },
        });
        if (live) {
            throw new BadRequestException(
                'A transaction is already in progress for this listing',
            );
        }

        const finalPrice = toNumber(offer.responsePrice ?? offer.offeredPrice);

        const currency = (
            (await this.settingsService.findValue(SETTING_BASE_CURRENCY)) ??
            DEFAULT_CURRENCY
        ).toLowerCase();

        const transaction = await this.transactionRepo.create({
            data: {
                connectionId: offer.connection.id,
                buyerId: offer.connection.buyerId,
                sellerId: offer.connection.sellerId,
                propertyId: offer.property.id,
                finalPrice,
                terms: createDto.terms,
                status: TransactionStatus.PENDING,
            },
            include: {
                buyer: {
                    select: { id: true, fullName: true, email: true },
                },
                seller: {
                    select: { id: true, fullName: true, email: true },
                },
                property: { select: { id: true, title: true } },
            },
        });

        const paymentIntent = await this.stripeService.createPaymentIntent(
            finalPrice,
            currency,
            {
                transactionId: transaction.id,
                propertyId: transaction.propertyId,
                buyerId: transaction.buyerId,
            },
        );

        await this.transactionRepo.update({
            where: { id: transaction.id },
            data: { stripePaymentIntentId: paymentIntent.id },
        });

        return {
            transaction,
            paymentIntent: {
                id: paymentIntent.id,
                clientSecret: paymentIntent.client_secret,
                amount: paymentIntent.amount,
            },
        };
    }

    async confirmPayment(
        transactionId: string,
        userId: string,
        paymentIntentId: string,
    ) {
        const transaction = await this.transactionRepo.findUnique({
            where: { id: transactionId },
            include: {
                buyer: { select: { fullName: true, email: true } },
                seller: { select: { fullName: true, email: true } },
                property: { select: { title: true } },
            },
        });
        if (!transaction) throw new NotFoundException('Transaction not found');

        if (transaction.buyerId !== userId) {
            throw new ForbiddenException('Only the buyer can confirm payment');
        }

        if (paymentIntentId !== transaction.stripePaymentIntentId) {
            throw new BadRequestException(
                'Payment intent does not belong to this transaction',
            );
        }

        return this.settleConfirmedPayment(transactionId, paymentIntentId);
    }

    async settleFromStripe(paymentIntentId: string) {
        const transaction = await this.transactionRepo.findFirst({
            where: { stripePaymentIntentId: paymentIntentId },
        });
        if (!transaction) return null;
        return this.settleConfirmedPayment(transaction.id, paymentIntentId);
    }

    private async settleConfirmedPayment(
        transactionId: string,
        paymentIntentId: string,
    ) {
        const transaction = await this.transactionRepo.findUnique({
            where: { id: transactionId },
            include: {
                buyer: { select: { fullName: true, email: true } },
                seller: { select: { fullName: true, email: true } },
                property: { select: { title: true, status: true } },
                escrowHold: true,
            },
        });
        if (!transaction) throw new NotFoundException('Transaction not found');

        if (
            transaction.status === TransactionStatus.IN_PROGRESS &&
            transaction.escrowHold
        ) {
            return {
                transaction,
                escrow: transaction.escrowHold,
                inspectionEndDate: transaction.escrowHold.inspectionEndDate,
            };
        }

        if (transaction.status !== TransactionStatus.PENDING) {
            throw new BadRequestException(
                'This transaction is no longer awaiting payment',
            );
        }

        const paymentIntent =
            await this.stripeService.confirmPayment(paymentIntentId);

        if (!paymentIntent.success) {
            throw new BadRequestException('Payment could not be confirmed');
        }

        const expectedCents = Math.round(
            toNumber(transaction.finalPrice) * CENTS_PER_UNIT,
        );
        if (paymentIntent.paymentIntent.amount !== expectedCents) {
            throw new BadRequestException(
                'Payment amount does not match the agreed price',
            );
        }

        const escrow = await this.escrowService.hold(
            transactionId,
            transaction.finalPrice,
        );

        if (
            transaction.property.status === PropertyStatus.AVAILABLE ||
            transaction.property.status === PropertyStatus.PENDING
        ) {
            await this.propertyRepo.update({
                where: { id: transaction.propertyId },
                data: { status: PropertyStatus.PENDING },
            });
        }

        const held = await this.transactionRepo.findUnique({
            where: { id: transactionId },
            include: {
                buyer: {
                    select: { id: true, fullName: true, email: true },
                },
                seller: {
                    select: { id: true, fullName: true, email: true },
                },
                property: { select: { id: true, title: true } },
                escrowHold: true,
            },
        });

        return {
            transaction: held,
            escrow,
            inspectionEndDate: escrow.inspectionEndDate,
        };
    }

    async findAll(query: QueryTransactionDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? DEFAULT_LIMIT;
        const where: Prisma.TransactionWhereInput = {
            status: query.status,
            property: query.q
                ? {
                      OR: [
                          { title: { contains: query.q, mode: 'insensitive' } },
                          {
                              address: {
                                  contains: query.q,
                                  mode: 'insensitive',
                              },
                          },
                      ],
                  }
                : undefined,
        };

        const [items, total] = await Promise.all([
            this.transactionRepo.findMany({
                where,
                include: ADMIN_INCLUDE,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.transactionRepo.count({ where }),
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
            TransactionStatus.PENDING,
            TransactionStatus.IN_PROGRESS,
            TransactionStatus.COMPLETED,
            TransactionStatus.CANCELLED,
        ];

        return Promise.all(
            statuses.map(async (status) => {
                const rows = await this.transactionRepo.findMany({
                    where: { status },
                    select: { finalPrice: true },
                });

                return {
                    status,
                    count: rows.length,
                    volume: toNumber(
                        sumDecimal(rows.map((row) => row.finalPrice)),
                    ),
                };
            }),
        );
    }

    async getOne(transactionId: string, userId: string) {
        const transaction = await this.transactionRepo.findUnique({
            where: { id: transactionId },
            include: {
                buyer: {
                    select: { id: true, fullName: true, email: true },
                },
                seller: {
                    select: { id: true, fullName: true, email: true },
                },
                property: {
                    select: { id: true, title: true, address: true },
                },
                reviews: {
                    include: {
                        reviewer: { select: { id: true, fullName: true } },
                        reviewee: { select: { id: true, fullName: true } },
                    },
                },
            },
        });
        if (!transaction) throw new NotFoundException('Transaction not found');

        if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
            throw new ForbiddenException(
                'You are not part of this transaction',
            );
        }

        return transaction;
    }

    async getByBuyer(buyerId: string) {
        return this.transactionRepo.findMany({
            where: { buyerId },
            include: {
                property: {
                    select: {
                        id: true,
                        title: true,
                        price: true,
                        address: true,
                        locality: true,
                        status: true,
                        images: { orderBy: { order: 'asc' }, take: 1 },
                    },
                },
                seller: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        avatar: true,
                        phoneNumber: true,
                    },
                },
                escrowHold: true,
                dispute: { select: { id: true, title: true, status: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getBySeller(sellerId: string) {
        return this.transactionRepo.findMany({
            where: { sellerId },
            include: {
                property: {
                    select: {
                        id: true,
                        title: true,
                        price: true,
                        address: true,
                        locality: true,
                        status: true,
                        images: { orderBy: { order: 'asc' }, take: 1 },
                    },
                },
                buyer: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        avatar: true,
                        phoneNumber: true,
                    },
                },
                escrowHold: true,
                dispute: { select: { id: true, title: true, status: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}
