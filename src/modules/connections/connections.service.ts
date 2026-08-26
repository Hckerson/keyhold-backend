import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { ConnectionRepo } from '@common/repos/connection.repo';
import { PropertyRepo } from '@common/repos/property.repo';
import { UserRepo } from '@common/repos/user.repo';
import { SendGridEmailService } from '@common/services/email/sendgrid.service';
import { TwilioService } from '@common/services/notification/twilio.service';
import { ConnectionStatus, PropertyStatus } from '@generated/prisma/enums';
import { ConnectionNotificationContext } from '@common/interfaces/responses';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { NotificationType } from '@generated/prisma/enums';
import { CreateConnectionDto } from './dto';

const THREAD_PREVIEW = 1;
const BOOK_DEPTH = 20;

const listInclude = (viewerId: string) =>
    ({
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
        seller: {
            select: {
                id: true,
                fullName: true,
                email: true,
                avatar: true,
                phoneNumber: true,
                jobTitle: true,
                agencyName: true,
            },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: THREAD_PREVIEW },
        offers: { orderBy: { createdAt: 'desc' }, take: BOOK_DEPTH },
        viewings: { orderBy: { createdAt: 'desc' }, take: BOOK_DEPTH },
        _count: {
            select: {
                messages: { where: { receiverId: viewerId, isRead: false } },
                viewings: true,
                offers: true,
            },
        },
    }) satisfies Prisma.ConnectionInclude;

@Injectable()
export class ConnectionsService {
    constructor(
        private connectionRepo: ConnectionRepo,
        private propertyRepo: PropertyRepo,
        private userRepo: UserRepo,
        private emailService: SendGridEmailService,
        private smsService: TwilioService,
        private notificationsService: NotificationsService,
    ) {}

    async expressInterest(buyerId: string, createDto: CreateConnectionDto) {
        const property = await this.propertyRepo.findUnique({
            where: { id: createDto.propertyId },
        });
        if (!property) {
            throw new NotFoundException('Property not found');
        }

        if (property.sellerId === buyerId) {
            throw new BadRequestException(
                'You cannot express interest in your own property',
            );
        }

        if (property.status !== PropertyStatus.AVAILABLE) {
            throw new BadRequestException(
                'You can only enquire on available listings',
            );
        }

        const existing = await this.connectionRepo.findUnique({
            where: {
                buyerId_propertyId: {
                    buyerId,
                    propertyId: createDto.propertyId,
                },
            },
        });

        if (existing) {
            throw new BadRequestException(
                'You have already expressed interest in this property',
            );
        }

        const connection = await this.connectionRepo.create({
            data: {
                buyerId,
                propertyId: createDto.propertyId,
                sellerId: property.sellerId,
                status: ConnectionStatus.PENDING,
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

        await Promise.all([
            this.notifySeller(connection),
            this.notificationsService.notify({
                userId: connection.seller.id,
                type: NotificationType.CONNECTION_REQUEST,
                title: 'New buyer enquiry',
                body: `${connection.buyer.fullName} enquired about ${connection.property.title}`,
                entityType: 'CONNECTION',
                entityId: connection.id,
            }),
        ]);

        return connection;
    }

    async acceptConnection(connectionId: string, userId: string) {
        const connection = await this.connectionRepo.findUnique({
            where: { id: connectionId },
            include: {
                buyer: {
                    select: { id: true, fullName: true, email: true },
                },
                seller: {
                    select: { id: true, fullName: true, email: true },
                },
            },
        });
        if (!connection) {
            throw new NotFoundException('Connection not found');
        }

        if (connection.seller.id !== userId) {
            throw new ForbiddenException(
                'Only the seller can accept this connection',
            );
        }

        if (connection.status !== ConnectionStatus.PENDING) {
            throw new BadRequestException(
                'This enquiry has already been responded to',
            );
        }

        const updated = await this.connectionRepo.update({
            where: { id: connectionId },
            data: { status: ConnectionStatus.ACCEPTED },
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

        await Promise.all([
            this.notifyBuyerAccepted(updated),
            this.notificationsService.notify({
                userId: updated.buyer.id,
                type: NotificationType.STATUS_CHANGE,
                title: 'Enquiry accepted',
                body: `${updated.seller.fullName} accepted your enquiry on ${updated.property.title}`,
                entityType: 'CONNECTION',
                entityId: updated.id,
            }),
        ]);

        return updated;
    }

    async rejectConnection(connectionId: string, userId: string) {
        const connection = await this.connectionRepo.findUnique({
            where: { id: connectionId },
            include: { seller: { select: { id: true } } },
        });
        if (!connection) {
            throw new NotFoundException('Connection not found');
        }

        if (connection.seller.id !== userId) {
            throw new ForbiddenException(
                'Only the seller can reject this connection',
            );
        }

        if (connection.status !== ConnectionStatus.PENDING) {
            throw new BadRequestException(
                'This enquiry has already been responded to',
            );
        }

        return this.connectionRepo.update({
            where: { id: connectionId },
            data: { status: ConnectionStatus.REJECTED },
        });
    }

    async getByBuyer(buyerId: string) {
        return this.connectionRepo.findMany({
            where: { buyerId },
            include: listInclude(buyerId),
            orderBy: { updatedAt: 'desc' },
        });
    }

    async getBySeller(sellerId: string) {
        return this.connectionRepo.findMany({
            where: { sellerId },
            include: listInclude(sellerId),
            orderBy: { updatedAt: 'desc' },
        });
    }

    async getOne(connectionId: string) {
        const connection = await this.connectionRepo.findUnique({
            where: { id: connectionId },
            include: {
                buyer: {
                    select: { id: true, fullName: true, email: true },
                },
                seller: {
                    select: { id: true, fullName: true, email: true },
                },
                property: {
                    select: {
                        id: true,
                        title: true,
                        address: true,
                        price: true,
                    },
                },
                messages: { orderBy: { createdAt: 'desc' }, take: 10 },
                viewings: { orderBy: { createdAt: 'desc' } },
                offers: { orderBy: { createdAt: 'desc' } },
            },
        });
        if (!connection) {
            throw new NotFoundException('Connection not found');
        }
        return connection;
    }

    private async notifySeller(
        connection: ConnectionNotificationContext,
    ): Promise<void> {
        try {
            await this.emailService.sendConnectionNotification(
                connection.seller.email,
                connection.property.title,
                connection.buyer.fullName,
            );

            if (connection.seller.phoneNumber) {
                await this.smsService.sendConnectionNotificationSMS(
                    connection.seller.phoneNumber,
                    connection.property.title,
                );
            }
        } catch (error) {
            console.error('Failed to send notifications:', error);
        }
    }

    private async notifyBuyerAccepted(
        connection: ConnectionNotificationContext,
    ): Promise<void> {
        try {
            await this.emailService.sendConnectionNotification(
                connection.buyer.email,
                connection.property.title,
                connection.seller.fullName,
            );
        } catch (error) {
            console.error('Failed to send buyer notification:', error);
        }
    }
}
