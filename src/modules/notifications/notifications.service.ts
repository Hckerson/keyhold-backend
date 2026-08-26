import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { toNumber } from '@common/money';
import { NotificationRepo } from '@common/repos/notification.repo';
import { NotificationPreferenceRepo } from '@common/repos/notification-preference.repo';
import { ConnectionRepo } from '@common/repos/connection.repo';
import { OfferRepo } from '@common/repos/offer.repo';
import { ViewingRepo } from '@common/repos/viewing.repo';
import { NotificationChannel, NotificationType } from '@generated/prisma/enums';
import { QueryNotificationDto, UpdatePreferencesDto } from './dto';

const DEFAULT_LIMIT = 20;

const CONNECTION_ENTITY = 'CONNECTION';
const OFFER_ENTITY = 'OFFER';
const VIEWING_ENTITY = 'VIEWING';

const PROPERTY_SELECT = {
    id: true,
    title: true,
    address: true,
    locality: true,
    price: true,
    images: { select: { url: true }, orderBy: { order: 'asc' }, take: 1 },
} satisfies Prisma.PropertySelect;

export interface NotificationProperty {
    id: string;
    title: string;
    address: string;
    locality: string;
    price: number;
    image: string | null;
}

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
        private connectionRepo: ConnectionRepo,
        private offerRepo: OfferRepo,
        private viewingRepo: ViewingRepo,
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

        const properties = await this.resolveProperties(items);

        return {
            items: items.map((item) => ({
                ...item,
                property:
                    properties.get(`${item.entityType}:${item.entityId}`) ??
                    null,
            })),
            total,
            page,
            limit,
            pageCount: Math.max(1, Math.ceil(total / limit)),
        };
    }

    private async resolveProperties(
        notifications: { entityType: string | null; entityId: string | null }[],
    ) {
        const idsOf = (entityType: string) => [
            ...new Set(
                notifications
                    .filter(
                        (notification) =>
                            notification.entityType === entityType &&
                            notification.entityId,
                    )
                    .map((notification) => notification.entityId as string),
            ),
        ];

        const connectionIds = idsOf(CONNECTION_ENTITY);
        const offerIds = idsOf(OFFER_ENTITY);
        const viewingIds = idsOf(VIEWING_ENTITY);

        const [connections, offers, viewings] = await Promise.all([
            connectionIds.length
                ? this.connectionRepo.findMany({
                      where: { id: { in: connectionIds } },
                      select: {
                          id: true,
                          property: { select: PROPERTY_SELECT },
                      },
                  })
                : [],
            offerIds.length
                ? this.offerRepo.findMany({
                      where: { id: { in: offerIds } },
                      select: {
                          id: true,
                          connection: {
                              select: {
                                  property: { select: PROPERTY_SELECT },
                              },
                          },
                      },
                  })
                : [],
            viewingIds.length
                ? this.viewingRepo.findMany({
                      where: { id: { in: viewingIds } },
                      select: {
                          id: true,
                          connection: {
                              select: {
                                  property: { select: PROPERTY_SELECT },
                              },
                          },
                      },
                  })
                : [],
        ]);

        const shape = (
            property: Prisma.PropertyGetPayload<{
                select: typeof PROPERTY_SELECT;
            }>,
        ): NotificationProperty => ({
            id: property.id,
            title: property.title,
            address: property.address,
            locality: property.locality,
            price: toNumber(property.price),
            image: property.images[0]?.url ?? null,
        });

        const properties = new Map<string, NotificationProperty>();

        for (const connection of connections) {
            properties.set(
                `${CONNECTION_ENTITY}:${connection.id}`,
                shape(connection.property),
            );
        }
        for (const offer of offers) {
            properties.set(
                `${OFFER_ENTITY}:${offer.id}`,
                shape(offer.connection.property),
            );
        }
        for (const viewing of viewings) {
            properties.set(
                `${VIEWING_ENTITY}:${viewing.id}`,
                shape(viewing.connection.property),
            );
        }

        return properties;
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
