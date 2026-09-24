import {
    AuditActionType,
    ConciergeRequestStatus,
    ConciergeStatus,
    ConciergeTier,
    FlagStatus,
    FlagType,
    NotificationChannel,
    NotificationType,
    Prisma,
    VerificationStatus,
    VerificationType,
} from '../../generated/prisma/client';
import {
    CONCIERGE_CLIENTS,
    CONCIERGE_PRACTICES,
    CONCIERGE_REQUESTS,
    CONCIERGE_SERVICES,
    DOCUMENT_TYPES,
    FLAG_REASONS,
    MODERATION_REASONS,
    SAVED_SEARCH_NAMES,
    SUSPENSION_REASONS,
    VERIFICATION_REJECTIONS,
} from '../seed-data/content';
import { DOCUMENT_IMAGES, pick } from '../seed-data/images';
import { daysAgo, daysAhead, seedId } from '../seed-data/ids';
import { PLATFORM_SETTINGS } from '../seed-data/settings';
import type { SeededProperty } from './catalog';
import type { SeededBuyer } from './people';

const PREFERENCE_USER_COUNT = 20;

const NOTIFIED_BUYER_COUNT = 40;

const NOTIFICATIONS_PER_BUYER = 6;

const IDENTITY_BUYER_COUNT = 16;

const FLAG_COUNT = 12;

const AUDIT_COUNT = 80;

const SAVED_SEARCH_COUNT = 30;

const NOTIFICATION_TYPES: readonly NotificationType[] = [
    NotificationType.PRICE_DROP,
    NotificationType.NEW_LISTING,
    NotificationType.UNDER_OFFER,
    NotificationType.STATUS_CHANGE,
    NotificationType.OFFER_RESPONSE,
    NotificationType.VIEWING_CONFIRMATION,
    NotificationType.MESSAGE_RECEIVED,
    NotificationType.CONNECTION_REQUEST,
];

const NOTIFICATION_COPY: Record<
    NotificationType,
    { title: string; body: string }
> = {
    [NotificationType.PRICE_DROP]: {
        title: 'Price reduced',
        body: 'A property on your saved list came down this morning.',
    },
    [NotificationType.NEW_LISTING]: {
        title: 'New to market',
        body: 'A listing matching one of your saved searches has just gone live.',
    },
    [NotificationType.UNDER_OFFER]: {
        title: 'Now under offer',
        body: 'A property you are watching has accepted an offer.',
    },
    [NotificationType.STATUS_CHANGE]: {
        title: 'Listing status changed',
        body: 'The status of a property on your list has been updated.',
    },
    [NotificationType.OFFER_RESPONSE]: {
        title: 'Response to your offer',
        body: 'The listing side has responded to the offer you submitted.',
    },
    [NotificationType.VIEWING_CONFIRMATION]: {
        title: 'Viewing confirmed',
        body: 'Your private appointment has been confirmed by the listing agent.',
    },
    [NotificationType.MESSAGE_RECEIVED]: {
        title: 'New message',
        body: 'You have an unread message in one of your conversations.',
    },
    [NotificationType.CONNECTION_REQUEST]: {
        title: 'Connection request',
        body: 'An agent has opened a private thread on a property you saved.',
    },
};

const AUDIT_ACTIONS: readonly AuditActionType[] = [
    AuditActionType.PROPERTY_CREATED,
    AuditActionType.PROPERTY_UPDATED,
    AuditActionType.PROPERTY_FLAGGED,
    AuditActionType.USER_SUSPENDED,
    AuditActionType.TRANSACTION_CREATED,
    AuditActionType.TRANSACTION_COMPLETED,
    AuditActionType.OFFER_ACCEPTED,
    AuditActionType.DISPUTE_RESOLVED,
    AuditActionType.LOGIN,
];

const CONCIERGE_TIERS: readonly ConciergeTier[] = [
    ConciergeTier.PLATINUM,
    ConciergeTier.VIP,
    ConciergeTier.PREMIUM,
];

const CONCIERGE_STATUSES: readonly ConciergeStatus[] = [
    ConciergeStatus.ACQUIRING,
    ConciergeStatus.UNDER_CONTRACT,
    ConciergeStatus.DIVESTING,
    ConciergeStatus.DORMANT,
];

const cycle = <T>(pool: readonly T[], index: number): T =>
    pool[index % pool.length];

export const seedPlatform = async (
    tx: Prisma.TransactionClient,
    now: Date,
    adminId: string,
    sellerIds: string[],
    buyers: SeededBuyer[],
    properties: SeededProperty[],
): Promise<void> => {
    await tx.platformSetting.createMany({
        data: PLATFORM_SETTINGS.map((setting) => ({
            key: setting.key,
            value: setting.value,
            category: setting.category,
            updatedById: adminId,
        })),
        skipDuplicates: true,
    });

    const preferenceUsers = [
        adminId,
        ...sellerIds,
        ...buyers.slice(0, PREFERENCE_USER_COUNT).map((buyer) => buyer.id),
    ];

    await tx.notificationPreference.createMany({
        data: preferenceUsers.flatMap((userId, userIndex) =>
            NOTIFICATION_TYPES.map((type, typeIndex) => ({
                id: seedId('pref', userIndex, typeIndex),
                type,
                enabled: typeIndex !== 3,
                email: typeIndex % 2 === 0,
                sms: typeIndex === 5,
                inApp: true,
                userId,
            })),
        ),
    });

    await tx.notification.createMany({
        data: buyers
            .slice(0, NOTIFIED_BUYER_COUNT)
            .flatMap((buyer, buyerIndex) =>
                Array.from({ length: NOTIFICATIONS_PER_BUYER }, (_, slot) => {
                    const type = cycle(NOTIFICATION_TYPES, buyerIndex + slot);
                    const property = cycle(properties, buyerIndex + slot);
                    const isRead = slot > 1;
                    const createdAt = daysAgo(now, slot * 2 + (buyerIndex % 9));

                    return {
                        id: seedId('notif', buyerIndex, slot),
                        title: NOTIFICATION_COPY[type].title,
                        body: NOTIFICATION_COPY[type].body,
                        isRead,
                        type,
                        channel:
                            slot === 5
                                ? NotificationChannel.EMAIL
                                : NotificationChannel.IN_APP,
                        entityType: 'Property',
                        entityId: property.id,
                        userId: buyer.id,
                        readAt: isRead ? createdAt : null,
                        createdAt,
                    };
                }),
            ),
    });

    const identityUsers = [
        ...sellerIds,
        ...buyers.slice(0, IDENTITY_BUYER_COUNT).map((buyer) => buyer.id),
    ];

    await tx.identityDocument.createMany({
        data: identityUsers.map((userId, index) => {
            const status =
                index % 5 === 4
                    ? VerificationStatus.REJECTED
                    : index % 3 === 2
                      ? VerificationStatus.PENDING
                      : VerificationStatus.VERIFIED;
            const createdAt = daysAgo(now, 5 + index * 3);

            return {
                id: seedId('doc', index),
                documentType: cycle(DOCUMENT_TYPES, index),
                documentNumber: `HG-${String(100000 + index * 37)}`,
                issuerCountry: 'US',
                documentImageUrl: pick(DOCUMENT_IMAGES, index),
                faceImageUrl: null,
                status,
                rejectionReason:
                    status === VerificationStatus.REJECTED
                        ? cycle(VERIFICATION_REJECTIONS, index)
                        : null,
                userId,
                verifiedAt:
                    status === VerificationStatus.VERIFIED
                        ? daysAhead(createdAt, 1)
                        : null,
                expiresAt: daysAhead(createdAt, 1460),
                createdAt,
            };
        }),
    });

    await tx.verificationToken.createMany({
        data: identityUsers.slice(0, 8).map((userId, index) => {
            const createdAt = daysAgo(now, index + 1);

            return {
                id: seedId('token', index),
                token: seedId('token', 'value', index),
                type:
                    index % 2 === 0
                        ? VerificationType.EMAIL
                        : VerificationType.PHONE,
                status:
                    index % 3 === 0
                        ? VerificationStatus.PENDING
                        : VerificationStatus.VERIFIED,
                userId,
                expiresAt: daysAhead(createdAt, 2),
                verifiedAt: index % 3 === 0 ? null : daysAhead(createdAt, 1),
                createdAt,
            };
        }),
    });

    await tx.flag.createMany({
        data: Array.from({ length: FLAG_COUNT }, (_, index) => {
            const property = cycle(properties, index * 3);
            const status =
                index % 4 === 3
                    ? FlagStatus.DISMISSED
                    : index % 3 === 2
                      ? FlagStatus.RESOLVED
                      : FlagStatus.ACTIVE;
            const createdAt = daysAgo(now, 2 + index * 4);

            return {
                id: seedId('flag', index),
                type: FlagType.PROPERTY,
                reason: cycle(FLAG_REASONS, index),
                details: cycle(MODERATION_REASONS, index),
                status,
                targetId: property.id,
                creatorId: buyers[index % buyers.length].id,
                resolvedAt:
                    status === FlagStatus.ACTIVE
                        ? null
                        : daysAhead(createdAt, 2),
                createdAt,
            };
        }),
    });

    const suspended = buyers
        .filter((_, index) => index % 10 === 9)
        .slice(0, 12);

    await tx.userSuspension.createMany({
        data: suspended.map((buyer, index) => ({
            id: seedId('susp', index),
            reason: cycle(SUSPENSION_REASONS, index),
            duration: index % 3 === 0 ? null : 14 + index,
            notes: 'Raised by automated moderation and upheld on review.',
            userId: buyer.id,
            createdAt: daysAgo(now, 3 + index * 6),
        })),
    });

    await tx.savedSearch.createMany({
        data: Array.from({ length: SAVED_SEARCH_COUNT }, (_, index) => {
            const property = cycle(properties, index);

            return {
                id: seedId('search', index),
                name: cycle(SAVED_SEARCH_NAMES, index),
                locality: property.seed.locality,
                minPrice: new Prisma.Decimal(
                    Math.round(property.seed.price * 0.6),
                ),
                maxPrice: new Prisma.Decimal(
                    Math.round(property.seed.price * 1.2),
                ),
                minBedrooms: Math.max(1, property.seed.bedrooms - 1),
                minBathrooms: Math.max(1, property.seed.bathrooms - 1),
                minSqFt: Math.round(property.seed.sqFt * 0.7),
                notify: index % 4 !== 3,
                propertyType: property.seed.type,
                buyerId: buyers[index].id,
                lastRunAt: daysAgo(now, index % 7),
                createdAt: daysAgo(now, 20 + index * 3),
            };
        }),
    });

    await tx.auditLog.createMany({
        data: Array.from({ length: AUDIT_COUNT }, (_, index) => {
            const property = cycle(properties, index);

            return {
                id: seedId('audit', index),
                action: cycle(AUDIT_ACTIONS, index),
                entityType: 'Property',
                entityId: property.id,
                ipAddress: `198.51.100.${index % 250}`,
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                actorId: adminId,
                createdAt: daysAgo(now, index % 60),
            };
        }),
    });

    const conciergeAgentId = sellerIds[0];

    await tx.conciergeService.createMany({
        data: CONCIERGE_SERVICES.map((service, index) => ({
            id: seedId('csvc', index),
            key: service.key,
            label: service.label,
            capacity: 6 + index * 2,
            agentId: conciergeAgentId,
        })),
    });

    await tx.conciergePractice.createMany({
        data: CONCIERGE_PRACTICES.map((practice, index) => ({
            id: seedId('cprac', index),
            key: practice.key,
            label: practice.label,
            cadence: practice.cadence,
            agentId: conciergeAgentId,
        })),
    });

    const conciergeBuyers = buyers.slice(1, 1 + CONCIERGE_CLIENTS.length);

    await tx.conciergeClient.createMany({
        data: CONCIERGE_CLIENTS.map((client, index) => {
            const budget = 4_000_000 + index * 1_750_000;

            return {
                id: seedId('cclient', index),
                budget: new Prisma.Decimal(budget),
                allocated: new Prisma.Decimal(
                    Math.round(budget * (0.15 + index * 0.12)),
                ),
                clientSince: now.getFullYear() - (index % 5) - 1,
                nextAction: client.nextAction,
                lastContact: daysAgo(now, 1 + index * 4),
                tier: cycle(CONCIERGE_TIERS, index),
                status: cycle(CONCIERGE_STATUSES, index),
                agentId: conciergeAgentId,
                clientId: conciergeBuyers[index].id,
                createdAt: daysAgo(now, 200 + index * 30),
            };
        }),
    });

    await tx.conciergePracticeCoverage.createMany({
        data: CONCIERGE_CLIENTS.flatMap((_, clientIndex) =>
            CONCIERGE_PRACTICES.filter(
                (__, practiceIndex) => (clientIndex + practiceIndex) % 2 === 0,
            ).map((practice) => ({
                id: seedId('ccov', clientIndex, practice.key),
                practiceId: seedId(
                    'cprac',
                    CONCIERGE_PRACTICES.findIndex(
                        (entry) => entry.key === practice.key,
                    ),
                ),
                clientId: seedId('cclient', clientIndex),
                createdAt: daysAgo(now, 90 + clientIndex * 10),
            })),
        ),
    });

    await tx.conciergeServiceRequest.createMany({
        data: CONCIERGE_CLIENTS.flatMap((_, clientIndex) =>
            Array.from({ length: 2 }, (__, slot) => {
                const status = cycle(
                    [
                        ConciergeRequestStatus.OPEN,
                        ConciergeRequestStatus.IN_PROGRESS,
                        ConciergeRequestStatus.CLOSED,
                    ],
                    clientIndex + slot,
                );
                const createdAt = daysAgo(now, 5 + clientIndex * 7 + slot);

                return {
                    id: seedId('creq', clientIndex, slot),
                    summary: cycle(CONCIERGE_REQUESTS, clientIndex + slot),
                    status,
                    closedAt:
                        status === ConciergeRequestStatus.CLOSED
                            ? daysAhead(createdAt, 3)
                            : null,
                    serviceId: seedId(
                        'csvc',
                        (clientIndex + slot) % CONCIERGE_SERVICES.length,
                    ),
                    clientId: seedId('cclient', clientIndex),
                    createdAt,
                };
            }),
        ),
    });
};
