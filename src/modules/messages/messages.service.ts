import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { MessageRepo } from '@common/repos/message.repo';
import { MessageAttachmentRepo } from '@common/repos/message-attachment.repo';
import { ConnectionRepo } from '@common/repos/connection.repo';
import { NotificationsService } from '@modules/notifications/notifications.service';
import {
    CloudinaryService,
    type UploadResponse,
} from '@common/services/storage/cloudinary.service';
import { NotificationType } from '@generated/prisma/enums';
import { CreateMessageDto } from './dto';
import {
    assertConnectionAccepted,
    assertConnectionParty,
} from '@common/access';

@Injectable()
export class MessagesService {
    constructor(
        private messageRepo: MessageRepo,
        private attachmentRepo: MessageAttachmentRepo,
        private connectionRepo: ConnectionRepo,
        private notificationsService: NotificationsService,
        private cloudinaryService: CloudinaryService,
    ) {}

    async attachFiles(
        messageId: string,
        userId: string,
        files: Express.Multer.File[],
    ) {
        if (!files || files.length === 0) {
            throw new BadRequestException('No files provided');
        }

        const message = await this.messageRepo.findUnique({
            where: { id: messageId },
        });
        if (!message) throw new NotFoundException('Message not found');

        if (message.senderId !== userId) {
            throw new ForbiddenException(
                'Only the sender can attach files to this message',
            );
        }

        const uploads: UploadResponse[] = [];

        try {
            for (const file of files) {
                uploads.push(
                    await this.cloudinaryService.uploadDocument(
                        file.buffer,
                        file.originalname,
                    ),
                );
            }

            await this.attachmentRepo.createMany({
                data: uploads.map((upload, index) => ({
                    messageId,
                    url: upload.url,
                    publicId: upload.publicId,
                    filename: files[index].originalname,
                    mimeType: files[index].mimetype,
                    sizeBytes: files[index].size,
                })),
            });

            return this.attachmentRepo.findMany({ where: { messageId } });
        } catch (error: unknown) {
            await Promise.all(
                uploads.map((upload) =>
                    this.cloudinaryService.deleteImage(upload.publicId),
                ),
            );
            throw error;
        }
    }

    async sendMessage(userId: string, createDto: CreateMessageDto) {
        const connection = await this.connectionRepo.findUnique({
            where: { id: createDto.connectionId },
        });
        if (!connection) throw new NotFoundException('Connection not found');

        assertConnectionParty(connection, userId);
        assertConnectionAccepted(connection);

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
                attachments: true,
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

        assertConnectionParty(connection, userId);

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
                attachments: true,
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
