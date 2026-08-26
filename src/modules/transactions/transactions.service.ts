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
import { sumDecimal, toNumber } from '@common/money';
import { PropertyRepo } from '@common/repos/property.repo';
import { StripeService } from '@common/services/payment/stripe.service';
import { PropertyStatus, TransactionStatus } from '@generated/prisma/enums';
import { EscrowService } from '@modules/escrow/escrow.service';
import { CreateTransactionDto, QueryTransactionDto } from './dto';

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
        private stripeService: StripeService,
        private escrowService: EscrowService,
    ) {}

    async initiateTransaction(userId: string, createDto: CreateTransactionDto) {
        const offer = await this.offerRepo.findUnique({
            where: { id: createDto.offerId },
            include: {
                connection: {
                    select: { id: true, buyerId: true, sellerId: true },
                },
                property: { select: { id: true } },
            },
        });
        if (!offer) throw new NotFoundException('Offer not found');

        if (offer.connection?.buyerId !== userId) {
            throw new ForbiddenException(
                'Only the buyer can initiate transaction',
            );
        }

        if (offer.status !== 'ACCEPTED') {
            throw new BadRequestException(
                'Offer must be accepted to initiate transaction',
            );
        }

        const transaction = await this.transactionRepo.create({
            data: {
                connectionId: offer.connection.id,
                buyerId: offer.connection.buyerId,
                sellerId: offer.connection.sellerId,
                propertyId: offer.property.id,
                finalPrice: createDto.finalPrice,
                terms: createDto.terms,
                status: 'PENDING',
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
            createDto.finalPrice,
            'usd',
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

        const paymentIntent =
            await this.stripeService.confirmPayment(paymentIntentId);

        if (!paymentIntent.success) {
            throw new BadRequestException('Payment could not be confirmed');
        }

        const escrow = await this.escrowService.hold(
            transactionId,
            transaction.finalPrice,
        );

        await this.propertyRepo.update({
            where: { id: transaction.propertyId },
            data: { status: PropertyStatus.PENDING },
        });

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
