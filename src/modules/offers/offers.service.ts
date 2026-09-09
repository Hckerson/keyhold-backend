import {
    Injectable,
    Logger,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { toNumber } from '@common/money';
import { OfferRepo } from '@common/repos/offer.repo';
import { DealMilestoneRepo } from '@common/repos/deal-milestone.repo';
import { CloudinaryService } from '@common/services/storage/cloudinary.service';
import { ConnectionRepo } from '@common/repos/connection.repo';
import { PropertyRepo } from '@common/repos/property.repo';
import { EmailService } from '@common/services/email/email.service';
import { TwilioService } from '@common/services/notification/twilio.service';
import {
    Contingency,
    MilestoneKind,
    MilestoneStatus,
    OfferStatus,
    PropertyStatus,
    UserRole,
} from '@generated/prisma/enums';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { NotificationType } from '@generated/prisma/enums';
import { CreateOfferDto, RespondOfferDto, UpdateMilestoneDto } from './dto';
import {
    LIVE_OFFER_STATUSES,
    MAX_OFFER_EXPIRY_DAYS,
    MS_PER_DAY,
    OPEN_LISTING_STATUSES,
} from '@common/enums';
import {
    assertConnectionAccepted,
    assertConnectionParty,
} from '@common/access';

@Injectable()
export class OffersService {
    private readonly logger = new Logger(OffersService.name);

    constructor(
        private offerRepo: OfferRepo,
        private milestoneRepo: DealMilestoneRepo,
        private cloudinaryService: CloudinaryService,
        private connectionRepo: ConnectionRepo,
        private propertyRepo: PropertyRepo,
        private emailService: EmailService,
        private smsService: TwilioService,
        private notificationsService: NotificationsService,
    ) {}

    async makeOffer(userId: string, createDto: CreateOfferDto) {
        const connection = await this.connectionRepo.findUnique({
            where: { id: createDto.connectionId },
            include: {
                property: { select: { id: true, title: true, status: true } },
                seller: { select: { email: true, phoneNumber: true } },
                buyer: { select: { fullName: true } },
            },
        });
        if (!connection) throw new NotFoundException('Connection not found');

        if (connection.buyerId !== userId) {
            throw new ForbiddenException('Only buyers can make offers');
        }

        assertConnectionAccepted(connection);
        this.assertListingOpen(connection.property.status);

        const expiresAt = new Date(createDto.expiresAt);
        const horizon = new Date(
            Date.now() + MAX_OFFER_EXPIRY_DAYS * MS_PER_DAY,
        );
        if (isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
            throw new BadRequestException(
                'Expiration date must be in the future',
            );
        }
        if (expiresAt > horizon) {
            throw new BadRequestException(
                'Expiration date is too far in the future',
            );
        }

        const offer = await this.offerRepo.create({
            data: {
                connectionId: createDto.connectionId,
                propertyId: connection.property.id,
                offererId: userId,
                offeredPrice: createDto.offeredPrice,
                offeredTerms: createDto.offeredTerms,
                moveInDate: createDto.moveInDate
                    ? new Date(createDto.moveInDate)
                    : null,
                earnestMoney: createDto.earnestMoney ?? null,
                contingencies: createDto.contingencies ?? [],
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

        await Promise.all([
            this.notifySellerOfOffer(offer, connection),
            this.notificationsService.notify({
                userId: connection.sellerId,
                type: NotificationType.OFFER_RESPONSE,
                title: 'New offer received',
                body: `${connection.buyer.fullName} offered on ${connection.property.title}`,
                entityType: 'OFFER',
                entityId: offer.id,
            }),
        ]);

        return offer;
    }

    async acceptCounter(offerId: string, userId: string) {
        const offer = await this.offerRepo.findUnique({
            where: { id: offerId },
            include: { property: { select: { id: true, status: true } } },
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

        this.assertOfferOpen(offer.expiresAt);
        this.assertListingOpen(offer.property.status);

        const accepted = await this.offerRepo.update({
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

        await this.lockAcceptedDeal(offer.propertyId, offerId);
        return accepted;
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
                property: { select: { id: true, status: true } },
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

        this.assertOfferOpen(offer.expiresAt);
        this.assertListingOpen(offer.property.status);

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

        await Promise.all([
            this.notifyBuyerOfResponse(updated),
            this.notificationsService.notify({
                userId: updated.offererId,
                type: NotificationType.OFFER_RESPONSE,
                title: `Offer ${updated.status.toLowerCase()}`,
                body:
                    updated.responseFeedback ??
                    'The seller responded to your offer',
                entityType: 'OFFER',
                entityId: updated.id,
            }),
        ]);

        if (updated.status === OfferStatus.ACCEPTED) {
            await this.lockAcceptedDeal(offer.property.id, offerId);
        }

        return updated;
    }

    async getByConnection(connectionId: string, userId: string) {
        const connection = await this.connectionRepo.findUnique({
            where: { id: connectionId },
        });
        if (!connection) throw new NotFoundException('Connection not found');

        assertConnectionParty(connection, userId);

        return this.offerRepo.findMany({
            where: { connectionId },
            include: {
                offerer: { select: { id: true, fullName: true } },
                responseFrom: { select: { id: true, fullName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getOne(offerId: string, userId: string, role: UserRole) {
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
        if (role !== UserRole.ADMIN) {
            assertConnectionParty(offer.connection, userId);
        }
        return offer;
    }

    private assertListingOpen(status: PropertyStatus) {
        if (!OPEN_LISTING_STATUSES.includes(status)) {
            throw new BadRequestException(
                'Offers can only be made on available listings',
            );
        }
    }

    private assertOfferOpen(expiresAt: Date) {
        if (expiresAt <= new Date()) {
            throw new BadRequestException('This offer has expired');
        }
    }

    private async assertOfferParty(offerId: string, userId: string) {
        const offer = await this.offerRepo.findUnique({
            where: { id: offerId },
            select: {
                status: true,
                connection: { select: { sellerId: true, buyerId: true } },
            },
        });
        if (!offer) throw new NotFoundException('Offer not found');

        assertConnectionParty(offer.connection, userId);
        return offer;
    }

    async getMilestones(offerId: string, userId: string) {
        await this.assertOfferParty(offerId, userId);

        return this.milestoneRepo.findMany({
            where: { offerId },
            orderBy: { kind: 'asc' },
        });
    }

    async updateMilestone(
        offerId: string,
        kind: MilestoneKind,
        userId: string,
        updateDto: UpdateMilestoneDto,
    ) {
        const offer = await this.assertOfferParty(offerId, userId);

        if (offer.status !== OfferStatus.ACCEPTED) {
            throw new BadRequestException(
                'Milestones open once the offer is accepted',
            );
        }

        const completing = updateDto.status === MilestoneStatus.COMPLETED;

        return this.milestoneRepo.update({
            where: { offerId_kind: { offerId, kind } },
            data: {
                status: updateDto.status,
                dueAt: updateDto.dueAt ? new Date(updateDto.dueAt) : undefined,
                appraisedValue: updateDto.appraisedValue,
                note: updateDto.note,
                completedAt: completing ? new Date() : undefined,
            },
        });
    }

    async attachMilestoneDocument(
        offerId: string,
        kind: MilestoneKind,
        userId: string,
        file: Express.Multer.File | undefined,
    ) {
        if (!file) throw new BadRequestException('No file provided');
        await this.assertOfferParty(offerId, userId);

        const upload = await this.cloudinaryService.uploadDocument(
            file.buffer,
            file.originalname,
        );

        try {
            return await this.milestoneRepo.update({
                where: { offerId_kind: { offerId, kind } },
                data: {
                    documentUrl: upload.url,
                    documentPublicId: upload.publicId,
                    documentName: file.originalname,
                },
            });
        } catch (error: unknown) {
            await this.cloudinaryService.deleteImage(upload.publicId);
            throw error;
        }
    }

    private async seedMilestones(offerId: string) {
        const offer = await this.offerRepo.findUnique({
            where: { id: offerId },
            select: { contingencies: true },
        });
        if (!offer) return;

        const waived = (kind: Contingency) =>
            offer.contingencies.includes(kind)
                ? MilestoneStatus.PENDING
                : MilestoneStatus.WAIVED;

        await this.milestoneRepo.createMany({
            skipDuplicates: true,
            data: [
                {
                    offerId,
                    kind: MilestoneKind.INSPECTION,
                    status: waived(Contingency.INSPECTION),
                },
                {
                    offerId,
                    kind: MilestoneKind.APPRAISAL,
                    status: waived(Contingency.APPRAISAL),
                },
                {
                    offerId,
                    kind: MilestoneKind.FINANCING,
                    status: waived(Contingency.FINANCING),
                },
                {
                    offerId,
                    kind: MilestoneKind.CLOSING,
                    status: MilestoneStatus.PENDING,
                },
            ],
        });
    }

    private async lockAcceptedDeal(
        propertyId: string,
        acceptedOfferId: string,
    ) {
        await this.seedMilestones(acceptedOfferId);
        await this.offerRepo.updateMany({
            where: {
                propertyId,
                id: { not: acceptedOfferId },
                status: { in: [...LIVE_OFFER_STATUSES] },
            },
            data: { status: OfferStatus.REJECTED, respondedAt: new Date() },
        });
        await this.propertyRepo.update({
            where: { id: propertyId },
            data: { status: PropertyStatus.PENDING },
        });
    }

    private async notifySellerOfOffer(
        offer: { offeredPrice: Prisma.Decimal },
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
                toNumber(offer.offeredPrice),
            );

            if (connection.seller.phoneNumber) {
                await this.smsService.sendOfferNotificationSMS(
                    connection.seller.phoneNumber,
                    toNumber(offer.offeredPrice),
                );
            }
        } catch (error) {
            this.logger.error(
                `Failed to send offer notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    private async notifyBuyerOfResponse(offer: {
        status: string;
        responsePrice?: Prisma.Decimal | null;
        responseFeedback?: string | null;
        offerer: { email: string };
    }): Promise<void> {
        try {
            const statusText =
                offer.status === OfferStatus.ACCEPTED
                    ? 'ACCEPTED'
                    : offer.status === OfferStatus.REJECTED
                      ? 'REJECTED'
                      : `COUNTERED with $${toNumber(offer.responsePrice).toLocaleString()}`;

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
            this.logger.error(
                `Failed to notify buyer: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }
}
