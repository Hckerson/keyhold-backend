import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { ViewingRepo } from '@common/repos/viewing.repo';
import { ConnectionRepo } from '@common/repos/connection.repo';
import { SendGridEmailService } from '@common/services/email/sendgrid.service';
import { TwilioService } from '@common/services/notification/twilio.service';
import { ViewingStatus } from '@generated/prisma/enums';
import { CreateViewingDto } from './dto';

@Injectable()
export class ViewingsService {
    constructor(
        private viewingRepo: ViewingRepo,
        private connectionRepo: ConnectionRepo,
        private emailService: SendGridEmailService,
        private smsService: TwilioService,
    ) {}

    async requestViewing(userId: string, createDto: CreateViewingDto) {
        const connection = await this.connectionRepo.findUnique({
            where: { id: createDto.connectionId },
            include: { property: { select: { id: true } } },
        });
        if (!connection) throw new NotFoundException('Connection not found');

        if (connection.buyerId !== userId && connection.sellerId !== userId) {
            throw new ForbiddenException('You are not part of this connection');
        }

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

        if (
            viewing.connection.buyerId !== userId &&
            viewing.connection.sellerId !== userId
        ) {
            throw new ForbiddenException('You are not part of this connection');
        }

        const confirmedDate = new Date(confirmedTime);
        if (isNaN(confirmedDate.getTime())) {
            throw new BadRequestException('Invalid date format');
        }

        if (!viewing.proposedTimes.includes(confirmedTime)) {
            throw new BadRequestException(
                'Selected time is not in proposed times',
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

        await this.notifyViewingConfirmed(confirmed);
        return confirmed;
    }

    async getByConnection(connectionId: string, userId: string) {
        const connection = await this.connectionRepo.findUnique({
            where: { id: connectionId },
        });
        if (!connection) throw new NotFoundException('Connection not found');

        if (connection.buyerId !== userId && connection.sellerId !== userId) {
            throw new ForbiddenException('You are not part of this connection');
        }

        return this.viewingRepo.findMany({
            where: { connectionId },
            include: {
                requestedBy: { select: { id: true, fullName: true } },
                proposedBy: { select: { id: true, fullName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getOne(viewingId: string) {
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

        return this.viewingRepo.update({
            where: { id: viewingId },
            data: { status },
        });
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
            console.error('Failed to send viewing notification:', error);
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
            console.error('Failed to send confirmation:', error);
        }
    }
}
