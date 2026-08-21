import { UserDto } from './dto';
import { Injectable } from '@nestjs/common';
import { User } from 'generated/prisma/client';
import { Prisma } from 'generated/prisma/client';
import { TransactionStatus, UserTier } from '@generated/prisma/enums';
import { UserRepo } from '@common/repos/user.repo';
import { TransactionRepo } from '@common/repos/transaction.repo';

interface UserCreateData {
    email: string;
    fullName: string;
    phoneNumber?: string;
    role?: string;
    passwordHash?: string;
}

interface Settlement {
    transactions: number;
    volume: number;
}

const EMPTY_SETTLEMENT: Settlement = { transactions: 0, volume: 0 };

const TIER_KEYS: UserTier[] = [
    UserTier.PLATINUM,
    UserTier.PREMIUM,
    UserTier.STANDARD,
];

@Injectable()
export class UsersService {
    constructor(
        private userRepo: UserRepo,
        private transactionRepo: TransactionRepo,
    ) {}

    async create(data: UserCreateData): Promise<UserDto> {
        const user = await this.userRepo.create({
            data: data as Prisma.UserCreateInput,
        });
        return this.toDto(user);
    }

    async findAll(): Promise<UserDto[]> {
        const [users, settlements] = await Promise.all([
            this.userRepo.findMany({}),
            this.settlementsByUser(),
        ]);

        return users.map((user) =>
            this.toDto(user, settlements.get(user.id) ?? EMPTY_SETTLEMENT),
        );
    }

    async findOne(id: string): Promise<UserDto | null> {
        const user = await this.userRepo.findUnique({ where: { id } });
        if (!user) return null;

        const settlements = await this.settlementsByUser(id);
        return this.toDto(user, settlements.get(id) ?? EMPTY_SETTLEMENT);
    }

    async findByEmail(email: string): Promise<UserDto | null> {
        const user = await this.userRepo.findUnique({ where: { email } });
        return user ? this.toDto(user) : null;
    }

    async setTier(id: string, tier: UserTier): Promise<UserDto> {
        const user = await this.userRepo.update({
            where: { id },
            data: { tier },
        });
        return this.toDto(user);
    }

    async tierDistribution() {
        const counts = await Promise.all(
            TIER_KEYS.map(async (tier) => ({
                tier,
                count: await this.userRepo.count({ where: { tier } }),
            })),
        );
        const total = counts.reduce((sum, entry) => sum + entry.count, 0);
        return { total, segments: counts };
    }

    async update(id: string, data: Prisma.UserUpdateInput): Promise<UserDto> {
        const user = await this.userRepo.update({
            where: { id: String(id) },
            data,
        });
        return this.toDto(user);
    }

    async remove(id: string): Promise<UserDto> {
        const user = await this.userRepo.delete({ where: { id: String(id) } });
        return this.toDto(user);
    }

    private async settlementsByUser(userId?: string) {
        const where: Prisma.TransactionWhereInput = {
            status: TransactionStatus.COMPLETED,
            ...(userId
                ? { OR: [{ buyerId: userId }, { sellerId: userId }] }
                : {}),
        };

        const [asBuyer, asSeller] = await Promise.all([
            this.transactionRepo.groupBy({
                by: ['buyerId'],
                where,
                _count: { _all: true },
                _sum: { finalPrice: true },
            }),
            this.transactionRepo.groupBy({
                by: ['sellerId'],
                where,
                _count: { _all: true },
                _sum: { finalPrice: true },
            }),
        ]);

        const totals = new Map<string, Settlement>();

        const accumulate = (
            id: string,
            count: number | undefined,
            sum: number | null | undefined,
        ) => {
            const current = totals.get(id) ?? EMPTY_SETTLEMENT;
            totals.set(id, {
                transactions: current.transactions + (count ?? 0),
                volume: current.volume + (sum ?? 0),
            });
        };

        for (const row of asBuyer) {
            accumulate(
                row.buyerId,
                typeof row._count === 'object' ? row._count._all : 0,
                row._sum?.finalPrice,
            );
        }

        for (const row of asSeller) {
            accumulate(
                row.sellerId,
                typeof row._count === 'object' ? row._count._all : 0,
                row._sum?.finalPrice,
            );
        }

        return totals;
    }

    private toDto(user: User, settlement: Settlement = EMPTY_SETTLEMENT) {
        return {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            phoneNumber: user.phoneNumber || undefined,
            bio: user.bio || undefined,
            avatar: user.avatar || undefined,
            role: user.role,
            status: user.status,
            tier: user.tier,
            jobTitle: user.jobTitle || undefined,
            agencyName: user.agencyName || undefined,
            licenseNumber: user.licenseNumber || undefined,
            emailVerified: user.emailVerified,
            phoneVerified: user.phoneVerified,
            kycVerified: user.kycVerified,
            transactions: settlement.transactions,
            volume: settlement.volume,
            lastActive: user.lastActive || undefined,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        } satisfies UserDto;
    }
}
