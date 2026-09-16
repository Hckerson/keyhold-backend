import {
    Injectable,
    Logger,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { ViewingRepo } from '@common/repos/viewing.repo';
import { ConnectionRepo } from '@common/repos/connection.repo';
import { EmailService } from '@common/services/email/email.service';
import { TwilioService } from '@common/services/notification/twilio.service';
import { ViewingStatus } from '@generated/prisma/enums';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { CalendarService } from '@modules/calendar/calendar.service';
import { NotificationType } from '@generated/prisma/enums';
import { CreateViewingDto } from './dto';
import { OPEN_LISTING_STATUSES } from '@common/enums';
import {
    assertConnectionAccepted,
    assertConnectionParty,
} from '@common/access';

@Injectable()
export class ViewingsService {
    private readonly logger = new Logger(ViewingsService.name);

    constructor(
        private viewingRepo: ViewingRepo,
        private connectionRepo: ConnectionRepo,
        private emailService: EmailService,
        private smsService: TwilioService,
        private notificationsService: NotificationsService,
        private calendarService: CalendarService,
    ) {}

    async requestViewing(userId: string, createDto: CreateViewingDto) {
        const connection = await this.connectionRepo.findUnique({
            where: { id: createDto.connectionId },
            include: { property: { select: { id: true, status: true } } },
        });
        if (!connection) throw new NotFoundException('Connection not found');

        assertConnectionParty(connection, userId);
        assertConnectionAccepted(connection);

        if (!OPEN_LISTING_STATUSES.includes(connection.property.status)) {
            throw new BadRequestException(
                'Viewings can only be booked on available listings',
            );
        }

        this.assertFutureTimes(createDto.proposedTimes);

        const requestedById = userId;
        const proposedByid =
            connection.buyerId === userId
                ? connection.sellerId
                : connection.buyerId;

        const viewing = await this.viewingRepo.create({
            data: {
                connectionId: createDto.connectionId,
                propertyId: connection.property.id,
                requestedById,
                proposedByid,
                proposedTimes: createDto.proposedTimes,
                mode: createDto.mode,
                durationMinutes: createDto.durationMinutes,
                status: ViewingStatus.PENDING,
            },
            include: {
                requestedBy: {
                    select: { id: true, fullName: true, email: true },
                },
                proposedBy: {
                    select: { id: true, fullName: true, email: true },
                },
                property: { select: { id: true, title: true } },
            },
        });

        await this.notifyProposedTimes(viewing);
        return viewing;
    }

    async confirmViewing(
        viewingId: string,
        userId: string,
        confirmedTime: string,
    ) {
        const viewing = await this.viewingRepo.findUnique({
            where: { id: viewingId },
            include: {
                connection: { select: { buyerId: true, sellerId: true } },
            },
        });
        if (!viewing) throw new NotFoundException('Viewing not found');

        assertConnectionParty(viewing.connection, userId);

        if (viewing.status !== ViewingStatus.PENDING) {
            throw new BadRequestException(
                'Only a pending viewing can be confirmed',
            );
        }

        const confirmedDate = new Date(confirmedTime);
        if (isNaN(confirmedDate.getTime())) {
            throw new BadRequestException('Invalid date format');
        }

        if (confirmedDate <= new Date()) {
            throw new BadRequestException('Cannot confirm a time in the past');
        }

        const proposedMatch = viewing.proposedTimes.some(
            (slot) => new Date(slot).getTime() === confirmedDate.getTime(),
        );
        if (!proposedMatch) {
            throw new BadRequestException(
                'Selected time is not in proposed times',
            );
        }

        const overlap = await this.viewingRepo.findFirst({
            where: {
                propertyId: viewing.propertyId,
                status: ViewingStatus.CONFIRMED,
                confirmedTime: confirmedDate,
            },
        });
        if (overlap) {
            throw new BadRequestException(
                'This time is already booked for the listing',
            );
        }

        const confirmed = await this.viewingRepo.update({
            where: { id: viewingId },
            data: {
                confirmedTime: confirmedDate,
                confirmedById: userId,
                status: ViewingStatus.CONFIRMED,
            },
            include: {
                requestedBy: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        phoneNumber: true,
                    },
                },
                proposedBy: {
                    select: { id: true, fullName: true, email: true },
                },
                property: { select: { id: true, title: true } },
            },
        });

        const recipientId =
            viewing.connection.buyerId === userId
                ? viewing.connection.sellerId
                : viewing.connection.buyerId;

        await Promise.all([
            this.notifyViewingConfirmed(confirmed),
            this.notificationsService.notify({
                userId: recipientId,
                type: NotificationType.VIEWING_CONFIRMATION,
                title: 'Viewing confirmed',
                body: `${confirmed.property.title} is confirmed for ${confirmedDate.toISOString()}`,
                entityType: 'VIEWING',
                entityId: confirmed.id,
            }),
        ]);

        void this.calendarService.pushViewing(confirmed.id);

        return confirmed;
    }

    async getByConnection(connectionId: string, userId: string) {
        const connection = await this.connectionRepo.findUnique({
            where: { id: connectionId },
        });
        if (!connection) throw new NotFoundException('Connection not found');

        assertConnectionParty(connection, userId);

        return this.viewingRepo.findMany({
            where: { connectionId },
            include: {
                requestedBy: { select: { id: true, fullName: true } },
                proposedBy: { select: { id: true, fullName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getOne(viewingId: string, userId: string) {
        const viewing = await this.viewingRepo.findUnique({
            where: { id: viewingId },
            include: {
                connection: {
                    include: {
                        buyer: {
                            select: {
                                id: true,
                                fullName: true,
                                phoneNumber: true,
                            },
                        },
                        seller: { select: { id: true, fullName: true } },
                    },
                },
                property: {
                    select: { id: true, title: true, address: true },
                },
                requestedBy: {
                    select: { id: true, fullName: true, email: true },
                },
                proposedBy: {
                    select: { id: true, fullName: true, email: true },
                },
            },
        });
        if (!viewing) throw new NotFoundException('Viewing not found');
        assertConnectionParty(viewing.connection, userId);
        return viewing;
    }

    async updateStatus(
        viewingId: string,
        userId: string,
        status: ViewingStatus,
    ) {
        const viewing = await this.viewingRepo.findUnique({
            where: { id: viewingId },
            include: {
                requestedBy: { select: { id: true } },
                proposedBy: { select: { id: true } },
            },
        });
        if (!viewing) throw new NotFoundException('Viewing not found');

        if (
            viewing.requestedBy.id !== userId &&
            viewing.proposedBy.id !== userId
        ) {
            throw new ForbiddenException('You are not part of this viewing');
        }

        const updated = await this.viewingRepo.update({
            where: { id: viewingId },
            data: { status },
        });

        if (status === ViewingStatus.CANCELLED) {
            void this.calendarService.removeViewing(viewingId);
        }

        return updated;
    }

    async reschedule(
        viewingId: string,
        userId: string,
        proposedTimes: string[],
    ) {
        const viewing = await this.viewingRepo.findUnique({
            where: { id: viewingId },
            include: {
                connection: { select: { buyerId: true, sellerId: true } },
            },
        });
        if (!viewing) throw new NotFoundException('Viewing not found');

        assertConnectionParty(viewing.connection, userId);

        if (viewing.status === ViewingStatus.CANCELLED) {
            throw new BadRequestException('This viewing has been cancelled');
        }

        this.assertFutureTimes(proposedTimes);

        const rescheduled = await this.viewingRepo.update({
            where: { id: viewingId },
            data: {
                proposedTimes,
                confirmedTime: null,
                confirmedById: null,
                status: ViewingStatus.PENDING,
            },
        });

        void this.calendarService.removeViewing(viewingId);

        return rescheduled;
    }

    private async notifyProposedTimes(viewing: {
        proposedBy: { email: string };
        requestedBy: { fullName: string };
        property: { title: string };
    }): Promise<void> {
        try {
            await this.emailService.sendViewingRequestNotification(
                viewing.proposedBy.email,
                viewing.requestedBy.fullName,
                viewing.property.title,
            );
        } catch (error) {
            this.logger.error(
                `Failed to send viewing notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    private async notifyViewingConfirmed(viewing: {
        confirmedTime: Date | null;
        requestedBy: { email: string; phoneNumber?: string | null };
        proposedBy: { fullName: string };
        property: { title: string };
    }): Promise<void> {
        try {
            const timeStr = viewing.confirmedTime
                ? new Date(viewing.confirmedTime).toLocaleString()
                : '';

            await this.emailService.sendViewingRequestNotification(
                viewing.requestedBy.email,
                viewing.proposedBy.fullName,
                `${viewing.property.title} - Viewing Confirmed at ${timeStr}`,
            );

            if (viewing.requestedBy.phoneNumber) {
                await this.smsService.sendViewingReminder(
                    viewing.requestedBy.phoneNumber,
                    viewing.property.title,
                    timeStr,
                );
            }
        } catch (error) {
            this.logger.error(
                `Failed to send confirmation: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    private assertFutureTimes(times: string[]) {
        const now = Date.now();
        const invalid = times.some((slot) => {
            const date = new Date(slot);
            return isNaN(date.getTime()) || date.getTime() <= now;
        });
        if (invalid) {
            throw new BadRequestException(
                'Viewing times must be in the future',
            );
        }
    }
}
