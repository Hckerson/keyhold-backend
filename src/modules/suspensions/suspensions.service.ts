import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { UserSuspensionRepo } from '@common/repos/user-suspension.repo';
import { UserRepo } from '@common/repos/user.repo';
import { UserAccountStatus } from '@generated/prisma/enums';
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

@Injectable()
export class SuspensionsService {
    constructor(
        private suspensionRepo: UserSuspensionRepo,
        private userRepo: UserRepo,
    ) {}

    async create(createDto: CreateSuspensionDto) {
        const user = await this.userRepo.findUnique({
            where: { id: createDto.userId },
            select: { id: true, status: true },
        });
        if (!user) throw new NotFoundException('User not found');

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
                data: { status: UserAccountStatus.SUSPENDED },
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
}
