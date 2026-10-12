import {
    ConnectionStatus,
    DisputeEvidenceType,
    DisputeStatus,
    EscrowStatus,
    OfferStatus,
    Prisma,
    PropertyStatus,
    TransactionStatus,
    ViewingMode,
    ViewingStatus,
} from '../../generated/prisma/client';
import {
    AGENT_INTRO,
    DISPUTE_SEEDS,
    EVIDENCE_LABELS,
    MESSAGE_SCRIPT,
    OFFER_FEEDBACK,
    OFFER_TERMS,
    REVIEW_COMMENTS,
    TRANSACTION_TERMS,
    VIEWING_NOTES,
} from '../seed-data/content';
import {
    DAYS_PER_MONTH,
    daysAgo,
    daysAhead,
    minutesAgo,
    SEED_FILES_ORIGIN,
    seedId,
} from '../seed-data/ids';
import type { SeededProperty } from './catalog';

const CONNECTIONS_PER_PROPERTY = 4;

const MESSAGES_PER_THREAD = 5;

const INSPECTION_WINDOW_DAYS = 10;

const OFFER_LIFETIME_DAYS = 14;

const CONNECTION_STATUS_CYCLE: readonly ConnectionStatus[] = [
    ConnectionStatus.ACCEPTED,
    ConnectionStatus.ACCEPTED,
    ConnectionStatus.PENDING,
    ConnectionStatus.REJECTED,
];

const VIEWING_STATUS_CYCLE: readonly ViewingStatus[] = [
    ViewingStatus.CONFIRMED,
    ViewingStatus.COMPLETED,
    ViewingStatus.PENDING,
    ViewingStatus.COMPLETED,
    ViewingStatus.CANCELLED,
];

const VIEWING_MODE_CYCLE: readonly ViewingMode[] = [
    ViewingMode.IN_PERSON,
    ViewingMode.VIRTUAL,
    ViewingMode.IN_PERSON,
    ViewingMode.OPEN_HOUSE,
];

const OFFER_STATUS_CYCLE: readonly OfferStatus[] = [
    OfferStatus.PENDING,
    OfferStatus.COUNTERED,
    OfferStatus.ACCEPTED,
    OfferStatus.REJECTED,
    OfferStatus.EXPIRED,
];

const DURATION_CYCLE: readonly number[] = [30, 45, 60, 90];

export interface SeededThread {
    id: string;
    property: SeededProperty;
    buyerId: string;
    sellerId: string;
    status: ConnectionStatus;
    createdAt: Date;
    index: number;
}

const cycle = <T>(pool: readonly T[], index: number): T =>
    pool[index % pool.length];

const isClosedSale = (thread: SeededThread) =>
    thread.property.seed.status === PropertyStatus.SOLD &&
    thread.property.seed.soldMonthsAgo !== undefined;

const rulingOf = (thread: SeededThread, resolved: boolean) => {
    if (!resolved) return EscrowStatus.DISPUTED;
    return isClosedSale(thread) ? EscrowStatus.RELEASED : EscrowStatus.REFUNDED;
};

export const seedDeals = async (
    tx: Prisma.TransactionClient,
    now: Date,
    properties: SeededProperty[],
): Promise<{ threads: SeededThread[]; transactionCount: number }> => {
    const threads: SeededThread[] = [];

    properties.forEach((property) => {
        property.savers
            .slice(0, CONNECTIONS_PER_PROPERTY)
            .forEach((buyer, slot) => {
                const index = threads.length;
                threads.push({
                    id: seedId('conn', property.seed.key, slot),
                    property,
                    buyerId: buyer.id,
                    sellerId: property.sellerId,
                    status:
                        property.seed.status === PropertyStatus.AVAILABLE
                            ? cycle(CONNECTION_STATUS_CYCLE, index)
                            : ConnectionStatus.ACCEPTED,
                    createdAt: daysAgo(
                        now,
                        Math.max(1, property.seed.listedDaysAgo - slot * 2),
                    ),
                    index,
                });
            });
    });

    await tx.connection.createMany({
        data: threads.map((thread) => ({
            id: thread.id,
            status: thread.status,
            buyerId: thread.buyerId,
            propertyId: thread.property.id,
            sellerId: thread.sellerId,
            createdAt: thread.createdAt,
        })),
    });

    const active = threads.filter(
        (thread) => thread.status === ConnectionStatus.ACCEPTED,
    );

    await tx.message.createMany({
        data: active.flatMap((thread) =>
            Array.from({ length: MESSAGES_PER_THREAD }, (_, step) => {
                const fromBuyer = step % 2 === 1;
                const sentAt = minutesAgo(
                    now,
                    (MESSAGES_PER_THREAD - step) * 90 + thread.index * 30,
                );

                return {
                    id: seedId('msg', thread.index, step),
                    content:
                        step === 0
                            ? cycle(AGENT_INTRO, thread.index)
                            : cycle(MESSAGE_SCRIPT, thread.index + step),
                    isRead: step < MESSAGES_PER_THREAD - 1,
                    connectionId: thread.id,
                    senderId: fromBuyer ? thread.buyerId : thread.sellerId,
                    receiverId: fromBuyer ? thread.sellerId : thread.buyerId,
                    readAt:
                        step < MESSAGES_PER_THREAD - 1
                            ? minutesAgo(now, thread.index * 30)
                            : null,
                    createdAt: sentAt,
                };
            }),
        ),
    });

    const touring = active.filter((thread) => thread.index % 3 !== 2);

    await tx.viewing.createMany({
        data: touring.map((thread) => {
            const status = cycle(VIEWING_STATUS_CYCLE, thread.index);
            const upcoming =
                status === ViewingStatus.CONFIRMED ||
                status === ViewingStatus.PENDING;
            const slot = upcoming
                ? daysAhead(now, 1 + (thread.index % 12))
                : daysAgo(now, 3 + (thread.index % 40));

            return {
                id: seedId('view', thread.index),
                proposedTimes: [
                    slot.toISOString(),
                    daysAhead(slot, 1).toISOString(),
                ],
                notes: cycle(VIEWING_NOTES, thread.index),
                durationMinutes: cycle(DURATION_CYCLE, thread.index),
                status,
                mode: cycle(VIEWING_MODE_CYCLE, thread.index),
                connectionId: thread.id,
                propertyId: thread.property.id,
                requestedById: thread.buyerId,
                proposedByid: thread.sellerId,
                confirmedById:
                    status === ViewingStatus.PENDING ? null : thread.sellerId,
                confirmedTime: status === ViewingStatus.PENDING ? null : slot,
                createdAt: daysAgo(now, 5 + (thread.index % 30)),
            };
        }),
    });

    const bidding = active.filter((thread) => thread.index % 2 === 0);

    await tx.offer.createMany({
        data: bidding.map((thread) => {
            const status = cycle(OFFER_STATUS_CYCLE, thread.index);
            const listPrice = thread.property.seed.price;
            const offeredPrice = Math.round(
                listPrice * (0.92 + (thread.index % 9) / 100),
            );
            const answered = status !== OfferStatus.PENDING;
            const createdAt = daysAgo(now, 2 + (thread.index % 30));

            return {
                id: seedId('offer', thread.index),
                offeredPrice,
                offeredTerms: cycle(OFFER_TERMS, thread.index),
                responsePrice:
                    status === OfferStatus.COUNTERED
                        ? Math.round((offeredPrice + listPrice) / 2)
                        : null,
                responseFeedback: answered
                    ? cycle(OFFER_FEEDBACK, thread.index)
                    : null,
                status,
                connectionId: thread.id,
                propertyId: thread.property.id,
                offererId: thread.buyerId,
                responseFromId: answered ? thread.sellerId : null,
                expiresAt: daysAhead(createdAt, OFFER_LIFETIME_DAYS),
                respondedAt: answered ? daysAhead(createdAt, 1) : null,
                createdAt,
            };
        }),
    });

    const settling = threads.filter(
        (thread) =>
            thread.property.seed.status !== PropertyStatus.AVAILABLE &&
            thread.index % CONNECTIONS_PER_PROPERTY === 0,
    );

    const disputed = settling.filter((_, index) => index % 3 === 0);

    const rulings = disputed.map((thread, index) => {
        const seed = cycle(DISPUTE_SEEDS, index);
        const createdAt = daysAgo(now, 20 + index * 9);
        const escrow = rulingOf(thread, seed.resolutions !== null);
        return {
            id: seedId('dispute', index),
            thread,
            seed,
            createdAt,
            escrow,
            note:
                seed.resolutions && escrow !== EscrowStatus.DISPUTED
                    ? seed.resolutions[escrow]
                    : null,
            resolvedAt: seed.resolutions ? daysAhead(createdAt, 6) : null,
        };
    });

    await tx.dispute.createMany({
        data: rulings.map((ruling) => ({
            id: ruling.id,
            title: ruling.seed.title,
            description: ruling.seed.description,
            status: ruling.resolvedAt
                ? DisputeStatus.RESOLVED
                : DisputeStatus.PENDING_REVIEW,
            resolutionNotes: ruling.note,
            initiatorId: ruling.thread.buyerId,
            resolvedAt: ruling.resolvedAt,
            createdAt: ruling.createdAt,
        })),
    });

    await tx.disputeEvidence.createMany({
        data: disputed.flatMap((_, index) =>
            Array.from({ length: 2 }, (__, slot) => ({
                id: seedId('devidence', index, slot),
                type:
                    slot === 0
                        ? DisputeEvidenceType.DOCUMENT
                        : DisputeEvidenceType.MESSAGE,
                content:
                    slot === 0
                        ? `${SEED_FILES_ORIGIN}/evidence/closing-statement.pdf`
                        : 'Exported message thread covering the release window.',
                label: cycle(EVIDENCE_LABELS, index + slot),
                disputeId: seedId('dispute', index),
                createdAt: daysAgo(now, 18 + index * 9),
            })),
        ),
    });

    const rulingByThread = new Map(
        rulings.map((ruling) => [ruling.thread.id, ruling]),
    );

    await tx.escrow.createMany({
        data: settling.map((thread, index) => {
            const sold = isClosedSale(thread);
            const closedAt = sold
                ? daysAgo(
                      now,
                      (thread.property.seed.soldMonthsAgo ?? 0) *
                          DAYS_PER_MONTH,
                  )
                : daysAgo(now, 6 + (index % 14));
            const ruling = rulingByThread.get(thread.id);

            return {
                id: seedId('escrow', index),
                amount: Math.round(thread.property.seed.price * 0.03),
                inspectionEndDate: daysAhead(closedAt, INSPECTION_WINDOW_DAYS),
                status: ruling
                    ? ruling.escrow
                    : sold
                      ? EscrowStatus.RELEASED
                      : EscrowStatus.HELD,
                releasedAt: ruling
                    ? ruling.escrow === EscrowStatus.RELEASED
                        ? ruling.resolvedAt
                        : null
                    : sold
                      ? closedAt
                      : null,
                refundedAt:
                    ruling?.escrow === EscrowStatus.REFUNDED
                        ? ruling.resolvedAt
                        : null,
                createdAt: daysAgo(now, 40 + index * 5),
            };
        }),
    });

    await tx.transaction.createMany({
        data: settling.map((thread, index) => {
            const sold = isClosedSale(thread);
            const ruling = rulingByThread.get(thread.id);
            const completedAt = sold
                ? daysAgo(
                      now,
                      (thread.property.seed.soldMonthsAgo ?? 0) *
                          DAYS_PER_MONTH,
                  )
                : null;

            return {
                id: seedId('txn', index),
                finalPrice: thread.property.seed.price,
                terms: cycle(TRANSACTION_TERMS, index),
                agreementDocUrl: `${SEED_FILES_ORIGIN}/agreements/${thread.property.seed.key}.pdf`,
                status:
                    ruling?.escrow === EscrowStatus.REFUNDED
                        ? TransactionStatus.CANCELLED
                        : sold
                          ? TransactionStatus.COMPLETED
                          : TransactionStatus.IN_PROGRESS,
                connectionId: thread.id,
                buyerId: thread.buyerId,
                sellerId: thread.sellerId,
                propertyId: thread.property.id,
                escrowHoldId: seedId('escrow', index),
                disputeId: ruling?.id ?? null,
                completedAt,
                createdAt: daysAgo(now, 60 + index * 5),
            };
        }),
    });

    const refunded = (thread: SeededThread) =>
        rulingByThread.get(thread.id)?.escrow === EscrowStatus.REFUNDED;
    const relisted = settling
        .filter(refunded)
        .map((thread) => thread.property.id)
        .filter(
            (propertyId) =>
                !settling.some(
                    (thread) =>
                        thread.property.id === propertyId && !refunded(thread),
                ),
        );

    await tx.property.updateMany({
        where: { id: { in: relisted } },
        data: { status: PropertyStatus.AVAILABLE },
    });

    const closed = settling.filter(
        (thread) => thread.property.seed.status === PropertyStatus.SOLD,
    );

    await tx.review.createMany({
        data: closed.flatMap((thread, index) => {
            const transactionId = seedId('txn', settling.indexOf(thread));
            const createdAt = daysAgo(now, 10 + index * 7);

            return [
                {
                    id: seedId('review', index, 'buyer'),
                    rating: 5 - (index % 2),
                    comment: cycle(REVIEW_COMMENTS, index),
                    transactionId,
                    reviewerId: thread.buyerId,
                    revieweeId: thread.sellerId,
                    createdAt,
                },
                {
                    id: seedId('review', index, 'seller'),
                    rating: 5,
                    comment: cycle(REVIEW_COMMENTS, index + 2),
                    transactionId,
                    reviewerId: thread.sellerId,
                    revieweeId: thread.buyerId,
                    createdAt,
                },
            ];
        }),
    });

    return { threads, transactionCount: settling.length };
};
