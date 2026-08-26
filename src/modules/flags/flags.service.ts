import { Injectable, NotFoundException } from '@nestjs/common';
import { toNumber } from '@common/money';
import { Prisma } from 'generated/prisma/client';
import { FlagRepo } from '@common/repos/flag.repo';
import { PropertyRepo } from '@common/repos/property.repo';
import { UserRepo } from '@common/repos/user.repo';
import { MessageRepo } from '@common/repos/message.repo';
import {
    FlagStatus,
    FlagType,
    PropertyStatus,
    UserAccountStatus,
} from '@generated/prisma/enums';
import { CreateFlagDto, QueryFlagDto, ResolveFlagDto } from './dto';

const DEFAULT_LIMIT = 20;

const CREATOR_SELECT = {
    creator: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.FlagInclude;

export interface FlagPropertyTarget {
    kind: typeof FlagType.PROPERTY;
    id: string;
    title: string;
    address: string;
    locality: string;
    price: number;
    status: PropertyStatus;
    image: string | null;
    images: string[];
    description: string;
    sqFt: number | null;
    sellerId: string;
    sellerName: string;
    sellerEmail: string;
    sellerPhone: string | null;
    sellerLicensed: boolean;
    sellerVerified: boolean;
}

export interface FlagUserTarget {
    kind: typeof FlagType.USER;
    id: string;
    fullName: string;
    email: string;
    avatar: string | null;
    status: UserAccountStatus;
}

export interface FlagMessageTarget {
    kind: typeof FlagType.MESSAGE;
    id: string;
    content: string;
    senderId: string;
    connectionId: string;
}

export type FlagTarget =
    | FlagPropertyTarget
    | FlagUserTarget
    | FlagMessageTarget
    | null;

@Injectable()
export class FlagsService {
    constructor(
        private flagRepo: FlagRepo,
        private propertyRepo: PropertyRepo,
        private userRepo: UserRepo,
        private messageRepo: MessageRepo,
    ) {}

    async create(creatorId: string, createDto: CreateFlagDto) {
        await this.assertTargetExists(createDto.type, createDto.targetId);

        return this.flagRepo.create({
            data: {
                type: createDto.type,
                targetId: createDto.targetId,
                reason: createDto.reason,
                details: createDto.details,
                creatorId,
                status: FlagStatus.ACTIVE,
            },
            include: CREATOR_SELECT,
        });
    }

    async findAll(query: QueryFlagDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? DEFAULT_LIMIT;
        const where: Prisma.FlagWhereInput = {
            status: query.status,
            type: query.type,
        };

        const [flags, total] = await Promise.all([
            this.flagRepo.findMany({
                where,
                include: CREATOR_SELECT,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.flagRepo.count({ where }),
        ]);

        const targets = await this.resolveTargets(flags);

        return {
            items: flags.map((flag) => ({
                ...flag,
                target: targets.get(`${flag.type}:${flag.targetId}`) ?? null,
            })),
            total,
            page,
            limit,
            pageCount: Math.max(1, Math.ceil(total / limit)),
        };
    }

    async findOne(id: string) {
        const flag = await this.flagRepo.findUnique({
            where: { id },
            include: CREATOR_SELECT,
        });
        if (!flag) throw new NotFoundException('Flag not found');

        const targets = await this.resolveTargets([flag]);
        return {
            ...flag,
            target: targets.get(`${flag.type}:${flag.targetId}`) ?? null,
        };
    }

    async counts() {
        const [active, resolved, dismissed, users, properties, messages] =
            await Promise.all([
                this.flagRepo.count({ where: { status: FlagStatus.ACTIVE } }),
                this.flagRepo.count({ where: { status: FlagStatus.RESOLVED } }),
                this.flagRepo.count({
                    where: { status: FlagStatus.DISMISSED },
                }),
                this.flagRepo.count({
                    where: { status: FlagStatus.ACTIVE, type: FlagType.USER },
                }),
                this.flagRepo.count({
                    where: {
                        status: FlagStatus.ACTIVE,
                        type: FlagType.PROPERTY,
                    },
                }),
                this.flagRepo.count({
                    where: {
                        status: FlagStatus.ACTIVE,
                        type: FlagType.MESSAGE,
                    },
                }),
            ]);

        const oldest = await this.flagRepo.findFirst({
            where: { status: FlagStatus.ACTIVE },
            orderBy: { createdAt: 'asc' },
            select: { createdAt: true },
        });

        return {
            active,
            resolved,
            dismissed,
            byType: { users, properties, messages },
            oldestActiveAt: oldest?.createdAt ?? null,
        };
    }

    async settle(id: string, status: FlagStatus, resolveDto: ResolveFlagDto) {
        const flag = await this.flagRepo.findUnique({ where: { id } });
        if (!flag) throw new NotFoundException('Flag not found');

        return this.flagRepo.update({
            where: { id },
            data: {
                status,
                details: resolveDto.note ?? flag.details,
                resolvedAt: new Date(),
            },
            include: CREATOR_SELECT,
        });
    }

    async recordDecision(params: {
        type: FlagType;
        targetId: string;
        creatorId: string;
        reason: string;
        details?: string;
    }) {
        return this.flagRepo.create({
            data: {
                type: params.type,
                targetId: params.targetId,
                creatorId: params.creatorId,
                reason: params.reason,
                details: params.details,
                status: FlagStatus.RESOLVED,
                resolvedAt: new Date(),
            },
        });
    }

    private async assertTargetExists(type: FlagType, targetId: string) {
        const exists = await this.targetExists(type, targetId);
        if (!exists) throw new NotFoundException('Flag target not found');
    }

    private async targetExists(type: FlagType, targetId: string) {
        if (type === FlagType.PROPERTY) {
            return Boolean(
                await this.propertyRepo.findUnique({
                    where: { id: targetId },
                    select: { id: true },
                }),
            );
        }
        if (type === FlagType.USER) {
            return Boolean(
                await this.userRepo.findUnique({
                    where: { id: targetId },
                    select: { id: true },
                }),
            );
        }
        return Boolean(
            await this.messageRepo.findUnique({
                where: { id: targetId },
                select: { id: true },
            }),
        );
    }

    private async resolveTargets(
        flags: { type: FlagType; targetId: string }[],
    ) {
        const idsOf = (type: FlagType) => [
            ...new Set(
                flags
                    .filter((flag) => flag.type === type)
                    .map((flag) => flag.targetId),
            ),
        ];

        const propertyIds = idsOf(FlagType.PROPERTY);
        const userIds = idsOf(FlagType.USER);
        const messageIds = idsOf(FlagType.MESSAGE);

        const [properties, users, messages] = await Promise.all([
            propertyIds.length
                ? this.propertyRepo.findMany({
                      where: { id: { in: propertyIds } },
                      select: {
                          id: true,
                          title: true,
                          address: true,
                          locality: true,
                          price: true,
                          status: true,
                          description: true,
                          sqFt: true,
                          images: { orderBy: { order: 'asc' } },
                          seller: {
                              select: {
                                  id: true,
                                  fullName: true,
                                  email: true,
                                  phoneNumber: true,
                                  licenseNumber: true,
                                  kycVerified: true,
                              },
                          },
                      },
                  })
                : [],
            userIds.length
                ? this.userRepo.findMany({
                      where: { id: { in: userIds } },
                      select: {
                          id: true,
                          fullName: true,
                          email: true,
                          avatar: true,
                          status: true,
                      },
                  })
                : [],
            messageIds.length
                ? this.messageRepo.findMany({
                      where: { id: { in: messageIds } },
                      select: {
                          id: true,
                          content: true,
                          senderId: true,
                          connectionId: true,
                      },
                  })
                : [],
        ]);

        const targets = new Map<string, FlagTarget>();

        for (const property of properties) {
            targets.set(`${FlagType.PROPERTY}:${property.id}`, {
                kind: FlagType.PROPERTY,
                id: property.id,
                title: property.title,
                address: property.address,
                locality: property.locality,
                price: toNumber(property.price),
                status: property.status,
                image: property.images[0]?.url ?? null,
                images: property.images.map((image) => image.url),
                description: property.description,
                sqFt: property.sqFt,
                sellerId: property.seller.id,
                sellerName: property.seller.fullName,
                sellerEmail: property.seller.email,
                sellerPhone: property.seller.phoneNumber,
                sellerLicensed: Boolean(property.seller.licenseNumber),
                sellerVerified: property.seller.kycVerified,
            });
        }

        for (const user of users) {
            targets.set(`${FlagType.USER}:${user.id}`, {
                kind: FlagType.USER,
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                avatar: user.avatar,
                status: user.status,
            });
        }

        for (const message of messages) {
            targets.set(`${FlagType.MESSAGE}:${message.id}`, {
                kind: FlagType.MESSAGE,
                id: message.id,
                content: message.content,
                senderId: message.senderId,
                connectionId: message.connectionId,
            });
        }

        return targets;
    }
}
