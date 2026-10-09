import {
    ConnectionStatus,
    FlagStatus,
    FlagType,
    Prisma,
} from '../../generated/prisma/client';
import {
    FLAG_RESOLUTION_NOTES,
    MEMBER_FLAG_SEEDS,
    MESSAGE_FLAG_SEEDS,
} from '../seed-data/content';
import { daysAgo, daysAhead, seedId } from '../seed-data/ids';
import type { SeededThread } from './deals';
import type { SeededBuyer } from './people';

const STATUS_CYCLE: readonly FlagStatus[] = [
    FlagStatus.ACTIVE,
    FlagStatus.ACTIVE,
    FlagStatus.RESOLVED,
    FlagStatus.ACTIVE,
    FlagStatus.DISMISSED,
    FlagStatus.RESOLVED,
];

const DECISION_LAG_DAYS = 2;
const BUYER_STRIDE = 7;
const THREAD_STRIDE = 5;

const cycle = <T>(pool: readonly T[], index: number): T =>
    pool[index % pool.length];

const decisionOf = (index: number, createdAt: Date) => {
    const status = cycle(STATUS_CYCLE, index);
    if (status === FlagStatus.ACTIVE)
        return { status, resolvedAt: null, resolutionNote: null };
    return {
        status,
        resolvedAt: daysAhead(createdAt, DECISION_LAG_DAYS),
        resolutionNote: cycle(FLAG_RESOLUTION_NOTES[status], index),
    };
};

export const seedReports = async (
    tx: Prisma.TransactionClient,
    now: Date,
    sellerIds: string[],
    buyers: SeededBuyer[],
    threads: SeededThread[],
): Promise<number> => {
    const memberFlags = MEMBER_FLAG_SEEDS.map((seed, index) => {
        const agentId = cycle(sellerIds, index);
        const buyerId = cycle(buyers, index * BUYER_STRIDE).id;
        const createdAt = daysAgo(now, 3 + index * 5);
        const againstAgent = seed.against === 'agent';

        return {
            id: seedId('flag', 'member', index),
            type: FlagType.USER,
            reason: seed.reason,
            details: seed.details,
            targetId: againstAgent ? agentId : buyerId,
            creatorId: againstAgent ? buyerId : agentId,
            createdAt,
            ...decisionOf(index, createdAt),
        };
    });

    const accepted = threads.filter(
        (thread) => thread.status === ConnectionStatus.ACCEPTED,
    );
    const messages = MESSAGE_FLAG_SEEDS.map((seed, index) => {
        const thread = cycle(accepted, index * THREAD_STRIDE);
        const fromAgent = seed.from === 'agent';
        const createdAt = daysAgo(now, 4 + index * 4);

        return {
            id: seedId('msg', 'flagged', index),
            content: seed.content,
            isRead: true,
            connectionId: thread.id,
            senderId: fromAgent ? thread.sellerId : thread.buyerId,
            receiverId: fromAgent ? thread.buyerId : thread.sellerId,
            readAt: createdAt,
            createdAt,
        };
    });

    await tx.message.createMany({ data: messages });

    const messageFlags = MESSAGE_FLAG_SEEDS.map((seed, index) => {
        const message = messages[index];
        const createdAt = daysAhead(message.createdAt, 1);

        return {
            id: seedId('flag', 'message', index),
            type: FlagType.MESSAGE,
            reason: seed.reason,
            details: seed.details,
            targetId: message.id,
            creatorId: message.receiverId,
            createdAt,
            ...decisionOf(index + 1, createdAt),
        };
    });

    const flags = [...memberFlags, ...messageFlags];
    await tx.flag.createMany({ data: flags });

    return flags.length;
};
