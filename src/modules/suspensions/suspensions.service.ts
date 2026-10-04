import {
    BadRequestException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { UserSuspensionRepo } from '@common/repos/user-suspension.repo';
import { UserRepo } from '@common/repos/user.repo';
import { UserAccountStatus, UserRole } from '@generated/prisma/enums';
import { MS_PER_DAY } from '@common/enums';
import { CreateSuspensionDto, QuerySuspensionDto } from './dto';

const DEFAULT_LIMIT = 20;

const ACCOUNT_INCLUDE = {
    user: {
        select: {
            id: true,
            fullName: true,
            email: true,
            avatar: true,
            role: true,
            status: true,
        },
    },
} satisfies Prisma.UserSuspensionInclude;

const hasExpired = (
    suspension: { createdAt: Date; duration: number | null },
    now: number,
) =>
    suspension.duration !== null &&
    suspension.createdAt.getTime() + suspension.duration * MS_PER_DAY <= now;

@Injectable()
export class SuspensionsService {
    constructor(
        private suspensionRepo: UserSuspensionRepo,
        private userRepo: UserRepo,
    ) {}

    async create(createDto: CreateSuspensionDto) {
        const user = await this.userRepo.findUnique({
            where: { id: createDto.userId },
            select: { id: true, status: true, role: true },
        });
        if (!user) throw new NotFoundException('User not found');

        if (user.role === UserRole.ADMIN) {
            throw new BadRequestException('Admin accounts cannot be suspended');
        }

        if (user.status === UserAccountStatus.SUSPENDED) {
            throw new BadRequestException('This account is already suspended');
        }

        const [suspension] = await Promise.all([
            this.suspensionRepo.create({
                data: {
                    userId: createDto.userId,
                    reason: createDto.reason,
                    duration: createDto.duration,
                    notes: createDto.notes,
                },
                include: ACCOUNT_INCLUDE,
            }),
            this.userRepo.update({
                where: { id: createDto.userId },
                data: {
                    status: UserAccountStatus.SUSPENDED,
                    tokensValidFrom: new Date(),
                },
            }),
        ]);

        return suspension;
    }

    async findAll(query: QuerySuspensionDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? DEFAULT_LIMIT;
        const where: Prisma.UserSuspensionWhereInput = {
            userId: query.userId,
            liftedAt: query.active ? null : undefined,
        };

        const [items, total] = await Promise.all([
            this.suspensionRepo.findMany({
                where,
                include: ACCOUNT_INCLUDE,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.suspensionRepo.count({ where }),
        ]);

        return {
            items,
            total,
            page,
            limit,
            pageCount: Math.max(1, Math.ceil(total / limit)),
        };
    }

    async findByUser(userId: string) {
        return this.suspensionRepo.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async lift(id: string) {
        const suspension = await this.suspensionRepo.findUnique({
            where: { id },
        });
        if (!suspension) throw new NotFoundException('Suspension not found');

        if (suspension.liftedAt) {
            throw new BadRequestException(
                'This suspension has already been lifted',
            );
        }

        const [lifted] = await Promise.all([
            this.suspensionRepo.update({
                where: { id },
                data: { liftedAt: new Date() },
                include: ACCOUNT_INCLUDE,
            }),
            this.userRepo.update({
                where: { id: suspension.userId },
                data: { status: UserAccountStatus.ACTIVE },
            }),
        ]);

        return lifted;
    }

    async liftExpired() {
        const timed = await this.suspensionRepo.findMany({
            where: { liftedAt: null, duration: { not: null } },
        });
        const now = Date.now();

        await Promise.all(
            timed
                .filter((suspension) => hasExpired(suspension, now))
                .map((suspension) => this.lift(suspension.id)),
        );
    }

    async ensureActive(userId: string, status: UserAccountStatus) {
        if (status !== UserAccountStatus.SUSPENDED) return;

        const active = await this.suspensionRepo.findFirst({
            where: { userId, liftedAt: null },
            orderBy: { createdAt: 'desc' },
        });

        if (!active) {
            await this.userRepo.update({
                where: { id: userId },
                data: { status: UserAccountStatus.ACTIVE },
            });
            return;
        }

        if (hasExpired(active, Date.now())) {
            await this.lift(active.id);
            return;
        }

        throw new UnauthorizedException('Account is suspended');
    }
}
