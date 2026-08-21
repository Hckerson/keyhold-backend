import {
    Injectable,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { MessageRepo } from '@common/repos/message.repo';
import { ConnectionRepo } from '@common/repos/connection.repo';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { NotificationType } from '@generated/prisma/enums';
import { CreateMessageDto } from './dto';

@Injectable()
export class MessagesService {
    constructor(
        private messageRepo: MessageRepo,
        private connectionRepo: ConnectionRepo,
        private notificationsService: NotificationsService,
    ) {}

    async sendMessage(userId: string, createDto: CreateMessageDto) {
        const connection = await this.connectionRepo.findUnique({
            where: { id: createDto.connectionId },
        });
        if (!connection) throw new NotFoundException('Connection not found');

        if (connection.buyerId !== userId && connection.sellerId !== userId) {
            throw new ForbiddenException('You are not part of this connection');
        }

        const receiverId =
            connection.buyerId === userId
                ? connection.sellerId
                : connection.buyerId;

        const message = await this.messageRepo.create({
            data: {
                connectionId: createDto.connectionId,
                senderId: userId,
                receiverId,
                content: createDto.content,
            },
            include: {
                sender: { select: { id: true, fullName: true } },
                receiver: { select: { id: true, fullName: true } },
            },
        });

        await this.notificationsService.notify({
            userId: receiverId,
            type: NotificationType.MESSAGE_RECEIVED,
            title: `New message from ${message.sender.fullName}`,
            body: message.content,
            entityType: 'CONNECTION',
            entityId: message.connectionId,
        });

        return message;
    }

    async getMessages(connectionId: string, userId: string) {
        const connection = await this.connectionRepo.findUnique({
            where: { id: connectionId },
        });
        if (!connection) throw new NotFoundException('Connection not found');

        if (connection.buyerId !== userId && connection.sellerId !== userId) {
            throw new ForbiddenException('You are not part of this connection');
        }

        await this.messageRepo.updateMany({
            where: {
                connectionId,
                receiverId: userId,
                isRead: false,
            },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
        return this.messageRepo.findMany({
            where: { connectionId },
            include: {
                sender: { select: { id: true, fullName: true } },
                receiver: { select: { id: true, fullName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getUnreadCount(userId: string) {
        return this.messageRepo.count({
            where: {
                receiverId: userId,
                isRead: false,
            },
        });
    }
}
