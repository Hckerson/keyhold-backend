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
import { ConnectionStatus } from '@generated/prisma/enums';
import { ConnectionNotificationContext } from '@common/interfaces/responses';
import { CreateConnectionDto } from './dto';

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
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        offers: { orderBy: { createdAt: 'desc' }, take: 1 },
        viewings: { orderBy: { createdAt: 'desc' }, take: 1 },
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

        await this.notifySeller(connection);
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

        await this.notifyBuyerAccepted(updated);
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
