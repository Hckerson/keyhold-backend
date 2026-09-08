import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { PropertyRepo } from '@common/repos/property.repo';
import {
    CloudinaryService,
    UploadResponse,
} from '@common/services/storage/cloudinary.service';
import { PrismaService } from '@common/database/prisma.service';
import { Prisma } from 'generated/prisma/client';
import {
    CreatePropertyDto,
    UpdatePropertyDto,
    QueryPropertyDto,
    PropertySort,
    FacetsPropertyDto,
    FacetOptionsDto,
    ModeratePropertyDto,
    ModerationDecision,
} from './dto';
import { FlagsService } from '@modules/flags/flags.service';
import { FlagType } from '@generated/prisma/enums';
import {
    OfferStatus,
    PropertyStatus,
    PropertyType,
    TransactionStatus,
    UserRole,
} from '@generated/prisma/enums';
import { OfferRepo } from '@common/repos/offer.repo';
import { TransactionRepo } from '@common/repos/transaction.repo';
import {
    LIVE_OFFER_STATUSES,
    LIVE_TRANSACTION_STATUSES,
    PUBLIC_PROPERTY_STATUSES,
} from '@common/enums';
import type { AuthUser } from '@core/auth/types/auth.types';

const LIST_INCLUDE = {
    images: { orderBy: { order: 'asc' } },
    seller: { select: { id: true, fullName: true, avatar: true } },
    _count: { select: { savedBy: true, viewings: true, offers: true } },
} satisfies Prisma.PropertyInclude;

const DETAIL_INCLUDE = {
    images: { orderBy: { order: 'asc' } },
    seller: {
        select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            avatar: true,
            bio: true,
            jobTitle: true,
            agencyName: true,
            licenseNumber: true,
            createdAt: true,
        },
    },
    _count: { select: { savedBy: true, viewings: true, offers: true } },
} satisfies Prisma.PropertyInclude;

const ORDER_BY: Record<PropertySort, Prisma.PropertyOrderByWithRelationInput> =
    {
        [PropertySort.NEWEST]: { createdAt: 'desc' },
        [PropertySort.PRICE_ASC]: { price: 'asc' },
        [PropertySort.PRICE_DESC]: { price: 'desc' },
        [PropertySort.BEDROOMS_DESC]: { bedrooms: 'desc' },
        [PropertySort.SQFT_DESC]: { sqFt: 'desc' },
        [PropertySort.POPULAR]: { viewsCount: 'desc' },
    };

const DEFAULT_LIMIT = 20;
const MILLISECONDS_PER_DAY = 86_400_000;

const MODERATION_STATUS: Record<ModerationDecision, PropertyStatus> = {
    [ModerationDecision.APPROVE]: PropertyStatus.AVAILABLE,
    [ModerationDecision.CHANGES]: PropertyStatus.DRAFT,
    [ModerationDecision.REJECT]: PropertyStatus.EXPIRED,
};

const PUBLIC_STATUSES: PropertyStatus[] = [
    PropertyStatus.AVAILABLE,
    PropertyStatus.PENDING,
    PropertyStatus.SOLD,
];

const SELLER_SETTABLE_STATUSES: PropertyStatus[] = [
    PropertyStatus.DRAFT,
    PropertyStatus.AVAILABLE,
    PropertyStatus.PENDING,
];

@Injectable()
export class PropertiesService {
    constructor(
        private propertyRepo: PropertyRepo,
        private cloudinaryService: CloudinaryService,
        private prisma: PrismaService,
        private flagsService: FlagsService,
        private offerRepo: OfferRepo,
        private transactionRepo: TransactionRepo,
    ) {}

    private statusClause(
        status: PropertyStatus | undefined,
        privileged: boolean,
    ): Prisma.EnumPropertyStatusFilter | PropertyStatus | undefined {
        if (privileged) return status;
        if (!status) return { in: PUBLIC_STATUSES };
        return PUBLIC_STATUSES.includes(status) ? status : { in: [] };
    }

    private countClause(tokens: string[]): Prisma.IntFilter[] {
        return tokens.map((token) =>
            token.endsWith('plus')
                ? { gte: Number(token.replace('plus', '')) }
                : { equals: Number(token) },
        );
    }

    private priceClause(ranges: string[]): Prisma.DecimalFilter[] {
        return ranges.map((range) => {
            const [min, max] = range.split('-');
            return max
                ? { gte: Number(min), lt: Number(max) }
                : { gte: Number(min) };
        });
    }

    private boundsClause(
        filters: QueryPropertyDto,
    ): Prisma.PropertyWhereInput | null {
        const { south, north, west, east } = filters;

        if (
            south === undefined ||
            north === undefined ||
            west === undefined ||
            east === undefined
        ) {
            return null;
        }

        if (south > north) {
            throw new BadRequestException(
                'Bounding box south edge must not exceed its north edge',
            );
        }

        const latitude = { gte: south, lte: north };

        return west <= east
            ? { AND: [{ latitude }, { longitude: { gte: west, lte: east } }] }
            : {
                  AND: [
                      { latitude },
                      {
                          OR: [
                              { longitude: { gte: west } },
                              { longitude: { lte: east } },
                          ],
                      },
                  ],
              };
    }

    private buildWhere(
        filters: QueryPropertyDto & { sellerId?: string },
        privileged = false,
    ): Prisma.PropertyWhereInput {
        const { q, types, priceRanges, beds, baths } = filters;
        const and: Prisma.PropertyWhereInput[] = [];

        if (priceRanges?.length) {
            and.push({
                OR: this.priceClause(priceRanges).map((price) => ({ price })),
            });
        }

        if (beds?.length) {
            and.push({
                OR: this.countClause(beds).map((bedrooms) => ({ bedrooms })),
            });
        }

        if (baths?.length) {
            and.push({
                OR: this.countClause(baths).map((bathrooms) => ({ bathrooms })),
            });
        }

        const bounds = this.boundsClause(filters);
        if (bounds) and.push(bounds);

        if (q) {
            and.push({
                OR: [
                    { title: { contains: q, mode: 'insensitive' } },
                    { description: { contains: q, mode: 'insensitive' } },
                    { address: { contains: q, mode: 'insensitive' } },
                    { locality: { contains: q, mode: 'insensitive' } },
                    { postalCode: { contains: q, mode: 'insensitive' } },
                ],
            });
        }

        return {
            status: this.statusClause(filters.status, privileged),
            sellerId: filters.sellerId,
            type: types?.length ? { in: types } : undefined,
            locality: filters.locality
                ? { equals: filters.locality, mode: 'insensitive' }
                : undefined,
            sqFt:
                filters.minSqFt !== undefined
                    ? { gte: filters.minSqFt }
                    : undefined,
            AND: and.length ? and : undefined,
        };
    }

    async findAll(
        filters: QueryPropertyDto & { sellerId?: string } = {},
        privileged = false,
    ) {
        const page = filters.page ?? 1;
        const limit = filters.limit ?? DEFAULT_LIMIT;
        const where = this.buildWhere(filters, privileged);

        const [items, total] = await Promise.all([
            this.propertyRepo.findMany({
                where,
                include: LIST_INCLUDE,
                orderBy: ORDER_BY[filters.sort ?? PropertySort.NEWEST],
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.propertyRepo.count({ where }),
        ]);

        return {
            items,
            total,
            page,
            limit,
            pageCount: Math.max(1, Math.ceil(total / limit)),
        };
    }

    async facets(dto: FacetsPropertyDto) {
        const filters = dto.filters ?? {};
        const options = dto.options ?? {};

        const countFor = async (
            group: keyof FacetOptionsDto,
            optionId: string,
        ) => {
            const scoped: QueryPropertyDto = { ...filters };
            if (group === 'price') scoped.priceRanges = [optionId];
            if (group === 'beds') scoped.beds = [optionId];
            if (group === 'baths') scoped.baths = [optionId];
            if (group === 'type') scoped.types = [optionId as PropertyType];

            const total = await this.propertyRepo.count({
                where: this.buildWhere(scoped),
            });
            return [optionId, total] as const;
        };

        const groups = ['price', 'beds', 'baths', 'type'] as const;
        const entries = await Promise.all(
            groups.map(async (group) => {
                const ids = options[group] ?? [];
                const counted = await Promise.all(
                    ids.map((id) => countFor(group, id)),
                );
                return [group, Object.fromEntries(counted)] as const;
            }),
        );

        return Object.fromEntries(entries) as Record<
            (typeof groups)[number],
            Record<string, number>
        >;
    }

    async findOne(id: string, viewer?: AuthUser) {
        const property = await this.propertyRepo.findUnique({
            where: { id },
            include: DETAIL_INCLUDE,
        });
        if (!property) {
            throw new NotFoundException(`Property with ID ${id} not found`);
        }

        const privileged =
            viewer?.id === property.sellerId || viewer?.role === UserRole.ADMIN;
        if (
            !privileged &&
            !PUBLIC_PROPERTY_STATUSES.includes(property.status)
        ) {
            throw new NotFoundException(`Property with ID ${id} not found`);
        }

        return property;
    }

    async recordView(id: string) {
        const property = await this.propertyRepo.findUnique({
            where: { id },
            select: { id: true, status: true },
        });
        if (!property || !PUBLIC_PROPERTY_STATUSES.includes(property.status)) {
            throw new NotFoundException(`Property with ID ${id} not found`);
        }

        await this.propertyRepo.updateMany({
            where: { id },
            data: { viewsCount: { increment: 1 } },
        });
        return { recorded: true };
    }

    async create(userId: string, createDto: CreatePropertyDto) {
        return this.propertyRepo.create({
            data: {
                ...createDto,
                sellerId: userId,
                status: PropertyStatus.AVAILABLE,
            },
            include: {
                seller: { select: { id: true, fullName: true, email: true } },
            },
        });
    }

    async update(id: string, userId: string, updateDto: UpdatePropertyDto) {
        const property = await this.propertyRepo.findUnique({ where: { id } });
        if (!property) {
            throw new NotFoundException(`Property with ID ${id} not found`);
        }

        if (property.sellerId !== userId) {
            throw new ForbiddenException(
                'You can only update your own properties',
            );
        }

        if (
            updateDto.status !== undefined &&
            !SELLER_SETTABLE_STATUSES.includes(updateDto.status)
        ) {
            throw new BadRequestException(
                'That status can only be set by an administrator',
            );
        }

        return this.propertyRepo.update({
            where: { id },
            data: updateDto,
            include: DETAIL_INCLUDE,
        });
    }

    async moderate(
        id: string,
        moderatorId: string,
        moderateDto: ModeratePropertyDto,
    ) {
        const property = await this.propertyRepo.findUnique({ where: { id } });
        if (!property) {
            throw new NotFoundException(`Property with ID ${id} not found`);
        }

        const note = moderateDto.note?.trim();
        if (moderateDto.decision !== ModerationDecision.APPROVE && !note) {
            throw new BadRequestException(
                'A note is required when requesting changes or rejecting',
            );
        }

        const status = MODERATION_STATUS[moderateDto.decision];

        const updated = await this.propertyRepo.update({
            where: { id },
            data: { status },
            include: DETAIL_INCLUDE,
        });

        await this.flagsService.recordDecision({
            type: FlagType.PROPERTY,
            targetId: id,
            creatorId: moderatorId,
            reason: `Listing ${moderateDto.decision}`,
            details: note,
        });

        return updated;
    }

    async delete(id: string, userId: string) {
        const property = await this.propertyRepo.findUnique({ where: { id } });
        if (!property) {
            throw new NotFoundException(`Property with ID ${id} not found`);
        }

        if (property.sellerId !== userId) {
            throw new ForbiddenException(
                'You can only delete your own properties',
            );
        }

        const [liveOffers, liveTransactions] = await Promise.all([
            this.offerRepo.count({
                where: {
                    propertyId: id,
                    status: {
                        in: [...LIVE_OFFER_STATUSES, OfferStatus.ACCEPTED],
                    },
                },
            }),
            this.transactionRepo.count({
                where: {
                    propertyId: id,
                    status: {
                        in: [
                            ...LIVE_TRANSACTION_STATUSES,
                            TransactionStatus.COMPLETED,
                        ],
                    },
                },
            }),
        ]);

        if (liveOffers > 0 || liveTransactions > 0) {
            throw new BadRequestException(
                'This listing has live offers or transactions and cannot be deleted',
            );
        }

        return this.propertyRepo.delete({ where: { id } });
    }

    async search(query: string, limit: number = DEFAULT_LIMIT) {
        if (!query || query.trim().length < 2) {
            throw new BadRequestException(
                'Search query must be at least 2 characters',
            );
        }
        return this.findAll({
            q: query,
            limit,
            status: PropertyStatus.AVAILABLE,
        });
    }

    async findBySeller(
        sellerId: string,
        filters: QueryPropertyDto = {},
        privileged = false,
    ) {
        return this.findAll({ ...filters, sellerId }, privileged);
    }

    private async ownedProperty(
        propertyId: string,
        userId: string,
        action: string,
    ) {
        const property = await this.propertyRepo.findUnique({
            where: { id: propertyId },
        });

        if (!property) {
            throw new NotFoundException(
                `Property with ID ${propertyId} not found`,
            );
        }

        if (property.sellerId !== userId) {
            throw new ForbiddenException(
                `You can only ${action} your own properties`,
            );
        }

        return property;
    }

    async uploadImages(
        propertyId: string,
        userId: string,
        files: Express.Multer.File[],
    ) {
        await this.ownedProperty(propertyId, userId, 'upload images for');

        if (!files || files.length === 0) {
            throw new BadRequestException('No files provided');
        }

        const maxOrder = await this.prisma.propertyImage.aggregate({
            where: { propertyId },
            _max: { order: true },
        });
        const firstOrder = (maxOrder._max.order || 0) + 1;

        const uploads: UploadResponse[] = [];

        try {
            for (const file of files) {
                uploads.push(
                    await this.cloudinaryService.uploadPropertyImage(
                        file.buffer,
                        file.originalname,
                    ),
                );
            }

            return await this.prisma.propertyImage.createManyAndReturn({
                data: uploads.map((upload, index) => ({
                    propertyId,
                    url: upload.url,
                    publicId: upload.publicId,
                    order: firstOrder + index,
                })),
            });
        } catch (error: unknown) {
            await Promise.all(
                uploads.map((upload) =>
                    this.cloudinaryService.deleteImage(upload.publicId),
                ),
            );
            throw error;
        }
    }

    async deleteImage(propertyId: string, imageId: string, userId: string) {
        await this.ownedProperty(propertyId, userId, 'remove images from');

        const image = await this.prisma.propertyImage.findUnique({
            where: { id: imageId },
        });

        if (!image || image.propertyId !== propertyId) {
            throw new NotFoundException(`Image with ID ${imageId} not found`);
        }

        await this.prisma.propertyImage.delete({ where: { id: imageId } });

        if (image.publicId) {
            await this.cloudinaryService.deleteImage(image.publicId);
        }

        return image;
    }

    async reorderImages(propertyId: string, userId: string, ids: string[]) {
        await this.ownedProperty(propertyId, userId, 'reorder images for');

        const held = await this.prisma.propertyImage.findMany({
            where: { propertyId },
            select: { id: true },
        });

        const known = new Set(held.map((image) => image.id));
        const listed = new Set(ids);

        if (
            listed.size !== ids.length ||
            listed.size !== known.size ||
            ids.some((id) => !known.has(id))
        ) {
            throw new BadRequestException(
                'The order must list every image on this listing exactly once',
            );
        }

        await this.prisma.$transaction(
            ids.map((id, order) =>
                this.prisma.propertyImage.update({
                    where: { id },
                    data: { order },
                }),
            ),
        );

        return this.prisma.propertyImage.findMany({
            where: { propertyId },
            orderBy: { order: 'asc' },
        });
    }

    async promote(id: string, userId: string, days: number) {
        const property = await this.propertyRepo.findUnique({ where: { id } });
        if (!property) {
            throw new NotFoundException(`Property with ID ${id} not found`);
        }

        if (property.sellerId !== userId) {
            throw new ForbiddenException(
                'You can only promote your own properties',
            );
        }

        const from =
            property.featuredUntil && property.featuredUntil > new Date()
                ? property.featuredUntil
                : new Date();

        const featuredUntil = new Date(
            from.getTime() + days * MILLISECONDS_PER_DAY,
        );

        return this.propertyRepo.update({
            where: { id },
            data: { featuredUntil },
        });
    }

    async markAsSold(id: string, userId: string) {
        const property = await this.propertyRepo.findUnique({ where: { id } });
        if (!property) {
            throw new NotFoundException(`Property with ID ${id} not found`);
        }

        if (property.sellerId !== userId) {
            throw new ForbiddenException(
                'You can only mark your own properties as sold',
            );
        }

        return this.propertyRepo.update({
            where: { id },
            data: { status: PropertyStatus.SOLD },
        });
    }
}
