import { Prisma } from 'generated/prisma/client';
import {
    DatabaseUnavailableCode,
    PoolTimeoutMessage,
} from '@common/enums/database';

const UNAVAILABLE_CODES = new Set<string>(
    Object.values(DatabaseUnavailableCode),
);
const POOL_TIMEOUTS = new Set<string>(Object.values(PoolTimeoutMessage));

export const databaseOutageReason = (error: unknown): string | null => {
    if (error instanceof Prisma.PrismaClientKnownRequestError)
        return UNAVAILABLE_CODES.has(error.code) ? error.code : null;
    if (!(error instanceof Error)) return null;
    if (POOL_TIMEOUTS.has(error.message)) return error.message;
    return databaseOutageReason(error.cause);
};
