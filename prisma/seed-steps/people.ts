import { faker } from '@faker-js/faker';
import {
    Prisma,
    UserAccountStatus,
    UserRole,
    UserTier,
} from '../../generated/prisma/client';
import { AGENT_SEEDS } from '../seed-data/agents';
import { CLIENT_PORTRAITS, pick } from '../seed-data/images';
import { daysAgo, seedId } from '../seed-data/ids';

export const BUYER_COUNT = 560;

export const ADMIN_EMAIL = 'admin@example.com';

export const BUYER_EMAIL = 'buyer@example.com';

export interface SeededBuyer {
    id: string;
    fullName: string;
    email: string;
    createdAt: Date;
}

export interface SeededPeople {
    adminId: string;
    sellerIdByKey: Map<string, string>;
    buyers: SeededBuyer[];
}

const TIER_CYCLE: readonly UserTier[] = [
    UserTier.STANDARD,
    UserTier.STANDARD,
    UserTier.STANDARD,
    UserTier.PREMIUM,
    UserTier.STANDARD,
    UserTier.PLATINUM,
];

const STATUS_CYCLE: readonly UserAccountStatus[] = [
    UserAccountStatus.ACTIVE,
    UserAccountStatus.ACTIVE,
    UserAccountStatus.ACTIVE,
    UserAccountStatus.ACTIVE,
    UserAccountStatus.ACTIVE,
    UserAccountStatus.ACTIVE,
    UserAccountStatus.ACTIVE,
    UserAccountStatus.PENDING,
    UserAccountStatus.ACTIVE,
    UserAccountStatus.SUSPENDED,
];

const buyerAgeDays = (index: number): number => 14 + ((index * 37) % 700);

export const seedPeople = async (
    tx: Prisma.TransactionClient,
    now: Date,
    passwordHash: string,
): Promise<SeededPeople> => {
    const adminId = seedId('user', 'admin');
    const adminCreatedAt = daysAgo(now, 730);

    const admin: Prisma.UserCreateManyInput = {
        id: adminId,
        fullName: 'Platform Administrator',
        email: ADMIN_EMAIL,
        passwordHash,
        phoneNumber: '+13105550001',
        avatar: pick(CLIENT_PORTRAITS, 4),
        bio: 'Oversees moderation, verification and settlement for the marketplace.',
        role: UserRole.ADMIN,
        status: UserAccountStatus.ACTIVE,
        tier: UserTier.PLATINUM,
        emailVerified: true,
        phoneVerified: true,
        kycVerified: true,
        lastActive: now,
        createdAt: adminCreatedAt,
    };

    const sellerIdByKey = new Map<string, string>();

    const sellers = AGENT_SEEDS.map((agent, index) => {
        const id = seedId('user', agent.key);
        sellerIdByKey.set(agent.key, id);
        const createdAt = daysAgo(now, 540 + index * 45);

        return {
            id,
            fullName: agent.fullName,
            email: agent.email,
            passwordHash,
            phoneNumber: agent.phoneNumber,
            avatar: agent.avatar,
            bio: `${agent.jobTitle} at ${agent.agencyName}. Typically replies within ${agent.responseMinutes} minutes.`,
            role: UserRole.SELLER,
            status: UserAccountStatus.ACTIVE,
            tier: index === 0 ? UserTier.PLATINUM : UserTier.PREMIUM,
            jobTitle: agent.jobTitle,
            agencyName: agent.agencyName,
            licenseNumber: agent.licenseNumber,
            emailVerified: true,
            phoneVerified: true,
            kycVerified: index < 3,
            lastActive: daysAgo(now, index),
            createdAt,
        } satisfies Prisma.UserCreateManyInput;
    });

    const buyers: SeededBuyer[] = Array.from(
        { length: BUYER_COUNT },
        (_, index) => {
            const firstName = faker.person.firstName();
            const lastName = faker.person.lastName();
            const createdAt = daysAgo(now, buyerAgeDays(index));

            return {
                id: seedId('user', 'b', index),
                fullName: `${firstName} ${lastName}`,
                email:
                    index === 0
                        ? BUYER_EMAIL
                        : `${firstName}.${lastName}.${index}@example.com`.toLowerCase(),
                createdAt,
            };
        },
    );

    const buyerRows = buyers.map((buyer, index) => {
        const status =
            index === 0
                ? UserAccountStatus.ACTIVE
                : STATUS_CYCLE[index % STATUS_CYCLE.length];

        return {
            id: buyer.id,
            fullName: buyer.fullName,
            email: buyer.email,
            passwordHash,
            phoneNumber: `+1310555${String(1000 + index).slice(-4)}`,
            avatar: pick(CLIENT_PORTRAITS, index),
            bio: faker.lorem.sentence(),
            role: UserRole.BUYER,
            status,
            tier:
                index === 0
                    ? UserTier.PREMIUM
                    : TIER_CYCLE[index % TIER_CYCLE.length],
            emailVerified: index % 7 !== 0,
            phoneVerified: index % 4 === 0,
            kycVerified: index % 11 === 0,
            kycRejected: index % 53 === 0,
            lastActive: daysAgo(now, index % 45),
            createdAt: buyer.createdAt,
        } satisfies Prisma.UserCreateManyInput;
    });

    await tx.user.createMany({ data: [admin, ...sellers, ...buyerRows] });

    return { adminId, sellerIdByKey, buyers };
};
