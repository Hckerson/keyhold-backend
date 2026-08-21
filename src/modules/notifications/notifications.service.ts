import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { NotificationRepo } from '@common/repos/notification.repo';
import { NotificationPreferenceRepo } from '@common/repos/notification-preference.repo';
import { NotificationChannel, NotificationType } from '@generated/prisma/enums';
import { QueryNotificationDto, UpdatePreferencesDto } from './dto';

const DEFAULT_LIMIT = 20;

export interface NotifyParams {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    entityType?: string;
    entityId?: string;
}

const DEFAULT_PREFERENCE = {
    enabled: true,
    email: true,
    sms: false,
    inApp: true,
};

@Injectable()
export class NotificationsService {
    constructor(
        private notificationRepo: NotificationRepo,
        private preferenceRepo: NotificationPreferenceRepo,
    ) {}

    async notify(params: NotifyParams) {
        const preference = await this.preferenceRepo.findUnique({
            where: {
                userId_type: { userId: params.userId, type: params.type },
            },
        });

        if (preference && !preference.enabled) return null;
        if (preference && !preference.inApp) return null;

        return this.notificationRepo.create({
            data: {
                userId: params.userId,
                type: params.type,
                title: params.title,
                body: params.body,
                entityType: params.entityType,
                entityId: params.entityId,
                channel: NotificationChannel.IN_APP,
            },
        });
    }

    async findAll(userId: string, query: QueryNotificationDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? DEFAULT_LIMIT;
        const where: Prisma.NotificationWhereInput = {
            userId,
            type: query.type,
            isRead: query.isRead,
        };

        const [items, total] = await Promise.all([
            this.notificationRepo.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.notificationRepo.count({ where }),
        ]);

        return {
            items,
            total,
            page,
            limit,
            pageCount: Math.max(1, Math.ceil(total / limit)),
        };
    }

    async unreadCount(userId: string) {
        return this.notificationRepo.count({
            where: { userId, isRead: false },
        });
    }

    async markRead(id: string, userId: string) {
        const notification = await this.notificationRepo.findFirst({
            where: { id, userId },
            select: { id: true },
        });
        if (!notification)
            throw new NotFoundException('Notification not found');

        return this.notificationRepo.update({
            where: { id },
            data: { isRead: true, readAt: new Date() },
        });
    }

    async markAllRead(userId: string) {
        const result = await this.notificationRepo.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });

        return { updated: result.count };
    }

    async remove(id: string, userId: string) {
        const result = await this.notificationRepo.deleteMany({
            where: { id, userId },
        });

        if (!result.count)
            throw new NotFoundException('Notification not found');
        return { removed: true };
    }

    async findPreferences(userId: string) {
        const stored = await this.preferenceRepo.findMany({
            where: { userId },
        });
        const byType = new Map(
            stored.map((preference) => [preference.type, preference]),
        );

        return Object.values(NotificationType).map((type) => {
            const preference = byType.get(type);
            return {
                type,
                enabled: preference?.enabled ?? DEFAULT_PREFERENCE.enabled,
                email: preference?.email ?? DEFAULT_PREFERENCE.email,
                sms: preference?.sms ?? DEFAULT_PREFERENCE.sms,
                inApp: preference?.inApp ?? DEFAULT_PREFERENCE.inApp,
            };
        });
    }

    async updatePreferences(userId: string, updateDto: UpdatePreferencesDto) {
        await Promise.all(
            updateDto.preferences.map((preference) =>
                this.preferenceRepo.upsert({
                    where: { userId_type: { userId, type: preference.type } },
                    create: { userId, ...preference },
                    update: {
                        enabled: preference.enabled,
                        email: preference.email,
                        sms: preference.sms,
                        inApp: preference.inApp,
                    },
                }),
            ),
        );

        return this.findPreferences(userId);
    }
}
