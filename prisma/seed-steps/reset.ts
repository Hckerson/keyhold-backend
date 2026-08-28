import type { Prisma } from '../../generated/prisma/client';
import { SEED_PREFIX } from '../seed-data/ids';
import { SETTING_KEYS } from '../seed-data/settings';
import { DOMAIN_DELETIONS } from './deletion-order';

const OWNED = { id: { startsWith: SEED_PREFIX } };

export const resetSeed = async (
    tx: Prisma.TransactionClient,
): Promise<number> => {
    let removed = 0;

    for (const step of DOMAIN_DELETIONS) {
        const result = await step.remove(tx, OWNED);
        removed += result.count;
    }

    const users = await tx.user.deleteMany({ where: OWNED });
    const settings = await tx.platformSetting.deleteMany({
        where: { key: { in: [...SETTING_KEYS] } },
    });

    return removed + users.count + settings.count;
};
