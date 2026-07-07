import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { TransactionRepo } from '@common/repos/transaction.repo';
import { OfferRepo } from '@common/repos/offer.repo';
import { ConnectionRepo } from '@common/repos/connection.repo';
import { PropertyRepo } from '@common/repos/property.repo';
import { StripeService } from '@common/services/payment/stripe.service';
import { SendGridEmailService } from '@common/services/email/sendgrid.service';
import { PDFService } from '@common/services/document/pdf.service';
import { CloudinaryService } from '@common/services/storage/cloudinary.service';
import { PropertyStatus } from '../../../generated/prisma';
import { CreateTransactionDto } from './dto';

@Injectable()
export class TransactionsService {
    constructor(
        private transactionRepo: TransactionRepo,
        private offerRepo: OfferRepo,
        private connectionRepo: ConnectionRepo,
        private propertyRepo: PropertyRepo,
        private stripeService: StripeService,
        private emailService: SendGridEmailService,
        private pdfService: PDFService,
        private cloudinaryService: CloudinaryService,
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

        const agreementPDF = this.pdfService.generatePurchaseAgreement({
            buyerName: transaction?.buyer?.fullName,
            buyerEmail: transaction?.buyer?.email,
            sellerName: transaction?.seller?.fullName,
            sellerEmail: transaction?.seller?.email,
            propertyTitle: transaction?.property?.title,
            propertyAddress: 'Address not specified',
            purchasePrice: transaction.finalPrice,
            terms: transaction.terms,
            date: new Date(),
        });

        const { url: docUrl } = await this.cloudinaryService.uploadDocument(
            agreementPDF,
            `agreement-${transactionId}.pdf`,
        );

        await this.propertyRepo.update({
            where: { id: transaction.propertyId },
            data: { status: PropertyStatus.SOLD },
        });

        const completed = await this.transactionRepo.update({
            where: { id: transactionId },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                agreementDocUrl: docUrl,
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

        await this.notifyBothParties(completed);

        return {
            transaction: completed,
            agreementUrl: docUrl,
        };
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
                property: { select: { id: true, title: true } },
                seller: { select: { id: true, fullName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getBySeller(sellerId: string) {
        return this.transactionRepo.findMany({
            where: { sellerId },
            include: {
                property: { select: { id: true, title: true } },
                buyer: { select: { id: true, fullName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    private async notifyBothParties(transaction: {
        buyer: { email: string };
        seller: { email: string };
        property: { title: string };
        finalPrice: number;
    }): Promise<void> {
        try {
            await this.emailService.sendTransactionCompletedEmail(
                transaction.buyer.email,
                transaction.property.title,
                transaction.finalPrice,
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
            console.error('Failed to send completion emails:', error);
        }
    }
}
