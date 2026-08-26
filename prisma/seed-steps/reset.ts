import { Prisma } from '../../generated/prisma/client';
import { SEED_PREFIX } from '../seed-data/ids';
import { SETTING_KEYS } from '../seed-data/settings';

const OWNED = { id: { startsWith: SEED_PREFIX } };

export const resetSeed = async (
    tx: Prisma.TransactionClient,
): Promise<number> => {
    const removals: (() => Promise<{ count: number }>)[] = [
        () => tx.conciergePracticeCoverage.deleteMany({ where: OWNED }),
        () => tx.conciergeServiceRequest.deleteMany({ where: OWNED }),
        () => tx.conciergePractice.deleteMany({ where: OWNED }),
        () => tx.conciergeService.deleteMany({ where: OWNED }),
        () => tx.conciergeClient.deleteMany({ where: OWNED }),
        () => tx.review.deleteMany({ where: OWNED }),
        () => tx.transaction.deleteMany({ where: OWNED }),
        () => tx.escrow.deleteMany({ where: OWNED }),
        () => tx.disputeEvidence.deleteMany({ where: OWNED }),
        () => tx.dispute.deleteMany({ where: OWNED }),
        () => tx.offer.deleteMany({ where: OWNED }),
        () => tx.viewing.deleteMany({ where: OWNED }),
        () => tx.message.deleteMany({ where: OWNED }),
        () => tx.connection.deleteMany({ where: OWNED }),
        () => tx.savedProperty.deleteMany({ where: OWNED }),
        () => tx.savedSearch.deleteMany({ where: OWNED }),
        () => tx.notification.deleteMany({ where: OWNED }),
        () => tx.notificationPreference.deleteMany({ where: OWNED }),
        () => tx.identityDocument.deleteMany({ where: OWNED }),
        () => tx.verificationToken.deleteMany({ where: OWNED }),
        () => tx.userSuspension.deleteMany({ where: OWNED }),
        () => tx.flag.deleteMany({ where: OWNED }),
        () => tx.auditLog.deleteMany({ where: OWNED }),
        () => tx.propertyImage.deleteMany({ where: OWNED }),
        () => tx.property.deleteMany({ where: OWNED }),
        () => tx.user.deleteMany({ where: OWNED }),
        () =>
            tx.platformSetting.deleteMany({
                where: { key: { in: [...SETTING_KEYS] } },
            }),
    ];

    let removed = 0;
    for (const removal of removals) {
        const result = await removal();
        removed += result.count;
    }

    return removed;
};
