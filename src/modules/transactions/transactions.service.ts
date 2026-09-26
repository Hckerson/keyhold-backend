import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { Prisma } from 'generated/prisma/client';
import { TransactionRepo } from '@common/repos/transaction.repo';
import { OfferRepo } from '@common/repos/offer.repo';
import { ConnectionRepo } from '@common/repos/connection.repo';
import { UserRepo } from '@common/repos/user.repo';
import { sumDecimal, toNumber } from '@common/money';
import { PropertyRepo } from '@common/repos/property.repo';
import {
    StripeService,
    smallestUnit,
} from '@common/services/payment/stripe.service';
import {
    OfferStatus,
    PropertyStatus,
    TransactionStatus,
} from '@generated/prisma/enums';
import { EscrowService } from '@modules/escrow/escrow.service';
import { SettingsService } from '@modules/settings/settings.service';
import { CreateTransactionDto, QueryTransactionDto } from './dto';
import {
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

const CHECKOUT_INCLUDE = {
    buyer: { select: { id: true, fullName: true, email: true } },
    seller: { select: { id: true, fullName: true, email: true } },
    property: { select: { id: true, title: true } },
} satisfies Prisma.TransactionInclude;

type CheckoutTransaction = Prisma.TransactionGetPayload<{
    include: typeof CHECKOUT_INCLUDE;
}>;

const PAYABLE_INTENT_STATUSES: Stripe.PaymentIntent.Status[] = [
    'requires_payment_method',
    'requires_confirmation',
    'requires_action',
];

const SETTLING_INTENT_STATUSES: Stripe.PaymentIntent.Status[] = [
    'processing',
    'requires_capture',
    'succeeded',
];

const checkoutMetadata = (transaction: CheckoutTransaction) => ({
    transactionId: transaction.id,
    propertyId: transaction.propertyId,
    buyerId: transaction.buyerId,
});

const checkoutResponse = (
    transaction: CheckoutTransaction,
    paymentIntent: Stripe.PaymentIntent,
) => ({
    transaction,
    paymentIntent: {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
    },
});

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

        const finalPrice = toNumber(offer.responsePrice ?? offer.offeredPrice);

        const live = await this.transactionRepo.findFirst({
            where: {
                propertyId: offer.property.id,
                status: { in: [...LIVE_TRANSACTION_STATUSES] },
            },
            include: CHECKOUT_INCLUDE,
        });
        if (live) {
            if (!this.isOwnOpenCheckout(live, userId, offer.connection.id)) {
                throw new BadRequestException(
                    'A transaction is already in progress for this listing',
                );
            }
            return this.resumeCheckout(live, finalPrice);
        }

        const currency = await this.baseCurrency();

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
            include: CHECKOUT_INCLUDE,
        });

        const paymentIntent = await this.stripeService.createPaymentIntent(
            finalPrice,
            currency,
            checkoutMetadata(transaction),
            transaction.id,
        );

        await this.transactionRepo.update({
            where: { id: transaction.id },
            data: { stripePaymentIntentId: paymentIntent.id },
        });

        return checkoutResponse(transaction, paymentIntent);
    }

    private isOwnOpenCheckout(
        live: CheckoutTransaction,
        userId: string,
        connectionId: string,
    ): boolean {
        return (
            live.buyerId === userId &&
            live.connectionId === connectionId &&
            live.status === TransactionStatus.PENDING
        );
    }

    private async resumeCheckout(
        transaction: CheckoutTransaction,
        finalPrice: number,
    ) {
        const currency = await this.baseCurrency();

        if (!transaction.stripePaymentIntentId) {
            return this.reissueIntent(
                transaction,
                finalPrice,
                currency,
                `${transaction.id}:resume`,
            );
        }

        const current = await this.stripeService.getPaymentIntent(
            transaction.stripePaymentIntentId,
        );

        if (SETTLING_INTENT_STATUSES.includes(current.status)) {
            throw new BadRequestException(
                'Your payment is already being processed for this listing',
            );
        }

        const payable = PAYABLE_INTENT_STATUSES.includes(current.status);
        const chargesAgreedPrice =
            current.currency === currency &&
            current.amount === smallestUnit(finalPrice, currency);

        if (payable && chargesAgreedPrice) {
            return checkoutResponse(transaction, current);
        }

        if (payable) {
            await this.stripeService.cancelPaymentIntent(current.id);
        }

        return this.reissueIntent(
            transaction,
            finalPrice,
            currency,
            `${transaction.id}:${current.id}`,
        );
    }

    private async reissueIntent(
        transaction: CheckoutTransaction,
        finalPrice: number,
        currency: string,
        idempotencyKey: string,
    ) {
        const replacement = await this.stripeService.createPaymentIntent(
            finalPrice,
            currency,
            checkoutMetadata(transaction),
            idempotencyKey,
        );

        const reissued = await this.transactionRepo.update({
            where: { id: transaction.id },
            data: { stripePaymentIntentId: replacement.id, finalPrice },
            include: CHECKOUT_INCLUDE,
        });

        return checkoutResponse(reissued, replacement);
    }

    private async baseCurrency(): Promise<string> {
        return (
            (await this.settingsService.findValue(SETTING_BASE_CURRENCY)) ??
            DEFAULT_CURRENCY
        ).toLowerCase();
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

        const expectedAmount = smallestUnit(
            toNumber(transaction.finalPrice),
            paymentIntent.paymentIntent.currency,
        );
        if (paymentIntent.paymentIntent.amount !== expectedAmount) {
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
