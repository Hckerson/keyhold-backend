import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { OfferRepo } from '@common/repos/offer.repo';
import { ConnectionRepo } from '@common/repos/connection.repo';
import { SendGridEmailService } from '@common/services/email/sendgrid.service';
import { TwilioService } from '@common/services/notification/twilio.service';
import { OfferStatus } from '@generated/prisma/enums';
import { CreateOfferDto, RespondOfferDto } from './dto';

@Injectable()
export class OffersService {
    constructor(
        private offerRepo: OfferRepo,
        private connectionRepo: ConnectionRepo,
        private emailService: SendGridEmailService,
        private smsService: TwilioService,
    ) {}

    async makeOffer(userId: string, createDto: CreateOfferDto) {
        const connection = await this.connectionRepo.findUnique({
            where: { id: createDto.connectionId },
            include: {
                property: { select: { id: true, title: true } },
                seller: { select: { email: true, phoneNumber: true } },
                buyer: { select: { fullName: true } },
            },
        });
        if (!connection) throw new NotFoundException('Connection not found');

        if (connection.buyerId !== userId) {
            throw new ForbiddenException('Only buyers can make offers');
        }

        const expiresAt = new Date(createDto.expiresAt);
        if (isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
            throw new BadRequestException(
                'Expiration date must be in the future',
            );
        }

        const offer = await this.offerRepo.create({
            data: {
                connectionId: createDto.connectionId,
                propertyId: connection.property.id,
                offererId: userId,
                offeredPrice: createDto.offeredPrice,
                offeredTerms: createDto.offeredTerms,
                expiresAt,
                status: OfferStatus.PENDING,
            },
            include: {
                offerer: {
                    select: { id: true, fullName: true, email: true },
                },
                connection: { select: { sellerId: true } },
            },
        });

        await this.notifySellerOfOffer(offer, connection);
        return offer;
    }

    async acceptCounter(offerId: string, userId: string) {
        const offer = await this.offerRepo.findUnique({
            where: { id: offerId },
        });
        if (!offer) throw new NotFoundException('Offer not found');

        if (offer.offererId !== userId) {
            throw new ForbiddenException(
                'Only the buyer can accept this counter',
            );
        }

        if (offer.status !== OfferStatus.COUNTERED) {
            throw new BadRequestException(
                'Only a countered offer can be accepted this way',
            );
        }

        return this.offerRepo.update({
            where: { id: offerId },
            data: {
                status: OfferStatus.ACCEPTED,
                offeredPrice: offer.responsePrice ?? offer.offeredPrice,
                respondedAt: new Date(),
            },
            include: {
                offerer: {
                    select: { id: true, fullName: true, email: true },
                },
                responseFrom: { select: { id: true, fullName: true } },
                property: { select: { id: true, title: true } },
            },
        });
    }

    async respondToOffer(
        offerId: string,
        userId: string,
        respondDto: RespondOfferDto,
    ) {
        const offer = await this.offerRepo.findUnique({
            where: { id: offerId },
            include: {
                connection: { select: { sellerId: true } },
            },
        });
        if (!offer) throw new NotFoundException('Offer not found');

        if (offer.connection.sellerId !== userId) {
            throw new ForbiddenException(
                'Only the seller can respond to this offer',
            );
        }

        if (offer.status !== OfferStatus.PENDING) {
            throw new BadRequestException(
                'This offer has already been responded to',
            );
        }

        if (
            respondDto.status === OfferStatus.COUNTERED &&
            !respondDto.responsePrice
        ) {
            throw new BadRequestException('Counter offer requires a price');
        }

        const updated = await this.offerRepo.update({
            where: { id: offerId },
            data: {
                status: respondDto.status,
                responseFromId: userId,
                responsePrice: respondDto.responsePrice,
                responseFeedback: respondDto.responseFeedback,
                respondedAt: new Date(),
            },
            include: {
                offerer: {
                    select: { id: true, fullName: true, email: true },
                },
                responseFrom: { select: { id: true, fullName: true } },
            },
        });

        await this.notifyBuyerOfResponse(updated);
        return updated;
    }

    async getByConnection(connectionId: string, userId: string) {
        const connection = await this.connectionRepo.findUnique({
            where: { id: connectionId },
        });
        if (!connection) throw new NotFoundException('Connection not found');

        if (connection.buyerId !== userId && connection.sellerId !== userId) {
            throw new ForbiddenException('You are not part of this connection');
        }

        return this.offerRepo.findMany({
            where: { connectionId },
            include: {
                offerer: { select: { id: true, fullName: true } },
                responseFrom: { select: { id: true, fullName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getOne(offerId: string) {
        const offer = await this.offerRepo.findUnique({
            where: { id: offerId },
            include: {
                offerer: {
                    select: { id: true, fullName: true, email: true },
                },
                responseFrom: { select: { id: true, fullName: true } },
                property: { select: { id: true, title: true } },
                connection: {
                    select: { id: true, sellerId: true, buyerId: true },
                },
            },
        });
        if (!offer) throw new NotFoundException('Offer not found');
        return offer;
    }

    private async notifySellerOfOffer(
        offer: { offeredPrice: number },
        connection: {
            seller: { email: string; phoneNumber?: string | null };
            buyer: { fullName: string };
            property: { title: string };
        },
    ): Promise<void> {
        try {
            await this.emailService.sendOfferNotification(
                connection.seller.email,
                connection.buyer.fullName,
                connection.property.title,
                offer.offeredPrice,
            );

            if (connection.seller.phoneNumber) {
                await this.smsService.sendOfferNotificationSMS(
                    connection.seller.phoneNumber,
                    offer.offeredPrice,
                );
            }
        } catch (error) {
            console.error('Failed to send offer notification:', error);
        }
    }

    private async notifyBuyerOfResponse(offer: {
        status: string;
        responsePrice?: number | null;
        responseFeedback?: string | null;
        offerer: { email: string };
    }): Promise<void> {
        try {
            const statusText =
                offer.status === OfferStatus.ACCEPTED
                    ? 'ACCEPTED'
                    : offer.status === OfferStatus.REJECTED
                      ? 'REJECTED'
                      : `COUNTERED with $${offer.responsePrice}`;

            await this.emailService.sendEmail({
                to: offer.offerer.email,
                subject: `Offer ${statusText}`,
                html: `
          <h2>Offer Response</h2>
          <p>Your offer has been <strong>${statusText}</strong>.</p>
          ${offer.responseFeedback ? `<p>Feedback: ${offer.responseFeedback}</p>` : ''}
        `,
            });
        } catch (error) {
            console.error('Failed to notify buyer:', error);
        }
    }
}
