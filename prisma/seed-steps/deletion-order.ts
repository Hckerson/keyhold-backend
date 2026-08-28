import type { Prisma } from '../../generated/prisma/client';

export interface DeletionScope {
    id?: { startsWith: string };
}

export interface DeletionStep {
    table: string;
    remove: (
        tx: Prisma.TransactionClient,
        scope: DeletionScope,
    ) => Promise<{ count: number }>;
}

export const DOMAIN_DELETIONS: readonly DeletionStep[] = [
    {
        table: 'ConciergePracticeCoverage',
        remove: (tx, scope) =>
            tx.conciergePracticeCoverage.deleteMany({ where: scope }),
    },
    {
        table: 'ConciergeServiceRequest',
        remove: (tx, scope) =>
            tx.conciergeServiceRequest.deleteMany({ where: scope }),
    },
    {
        table: 'ConciergePractice',
        remove: (tx, scope) =>
            tx.conciergePractice.deleteMany({ where: scope }),
    },
    {
        table: 'ConciergeService',
        remove: (tx, scope) => tx.conciergeService.deleteMany({ where: scope }),
    },
    {
        table: 'ConciergeClient',
        remove: (tx, scope) => tx.conciergeClient.deleteMany({ where: scope }),
    },
    {
        table: 'Review',
        remove: (tx, scope) => tx.review.deleteMany({ where: scope }),
    },
    {
        table: 'Transaction',
        remove: (tx, scope) => tx.transaction.deleteMany({ where: scope }),
    },
    {
        table: 'Escrow',
        remove: (tx, scope) => tx.escrow.deleteMany({ where: scope }),
    },
    {
        table: 'DisputeEvidence',
        remove: (tx, scope) => tx.disputeEvidence.deleteMany({ where: scope }),
    },
    {
        table: 'Dispute',
        remove: (tx, scope) => tx.dispute.deleteMany({ where: scope }),
    },
    {
        table: 'Offer',
        remove: (tx, scope) => tx.offer.deleteMany({ where: scope }),
    },
    {
        table: 'Viewing',
        remove: (tx, scope) => tx.viewing.deleteMany({ where: scope }),
    },
    {
        table: 'Message',
        remove: (tx, scope) => tx.message.deleteMany({ where: scope }),
    },
    {
        table: 'Connection',
        remove: (tx, scope) => tx.connection.deleteMany({ where: scope }),
    },
    {
        table: 'SavedProperty',
        remove: (tx, scope) => tx.savedProperty.deleteMany({ where: scope }),
    },
    {
        table: 'SavedSearch',
        remove: (tx, scope) => tx.savedSearch.deleteMany({ where: scope }),
    },
    {
        table: 'Notification',
        remove: (tx, scope) => tx.notification.deleteMany({ where: scope }),
    },
    {
        table: 'NotificationPreference',
        remove: (tx, scope) =>
            tx.notificationPreference.deleteMany({ where: scope }),
    },
    {
        table: 'IdentityDocument',
        remove: (tx, scope) => tx.identityDocument.deleteMany({ where: scope }),
    },
    {
        table: 'VerificationToken',
        remove: (tx, scope) =>
            tx.verificationToken.deleteMany({ where: scope }),
    },
    {
        table: 'PhoneVerification',
        remove: (tx, scope) =>
            tx.phoneVerification.deleteMany({ where: scope }),
    },
    {
        table: 'UserSuspension',
        remove: (tx, scope) => tx.userSuspension.deleteMany({ where: scope }),
    },
    {
        table: 'Flag',
        remove: (tx, scope) => tx.flag.deleteMany({ where: scope }),
    },
    {
        table: 'AuditLog',
        remove: (tx, scope) => tx.auditLog.deleteMany({ where: scope }),
    },
    {
        table: 'PropertyImage',
        remove: (tx, scope) => tx.propertyImage.deleteMany({ where: scope }),
    },
    {
        table: 'Property',
        remove: (tx, scope) => tx.property.deleteMany({ where: scope }),
    },
];
