import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { PropertyRepo } from '@common/repos/property.repo';
import { CloudinaryService } from '@common/services/storage/cloudinary.service';
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
import { PropertyStatus, PropertyType } from '@generated/prisma/enums';

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

@Injectable()
export class PropertiesService {
    constructor(
        private propertyRepo: PropertyRepo,
        private cloudinaryService: CloudinaryService,
        private prisma: PrismaService,
        private flagsService: FlagsService,
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

    private priceClause(ranges: string[]): Prisma.FloatFilter[] {
        return ranges.map((range) => {
            const [min, max] = range.split('-');
            return max
                ? { gte: Number(min), lt: Number(max) }
                : { gte: Number(min) };
        });
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

    async findOne(id: string) {
        const property = await this.propertyRepo.findUnique({
            where: { id },
            include: DETAIL_INCLUDE,
        });
        if (!property) {
            throw new NotFoundException(`Property with ID ${id} not found`);
        }
        return property;
    }

    async recordView(id: string) {
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

    async uploadImages(
        propertyId: string,
        userId: string,
        files: Express.Multer.File[],
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
                'You can only upload images for your own properties',
            );
        }

        if (!files || files.length === 0) {
            throw new BadRequestException('No files provided');
        }

        const uploadedImages: Array<{
            id: string;
            propertyId: string;
            url: string;
            order: number;
            createdAt: Date;
            updatedAt: Date;
        }> = [];

        const maxOrder = await this.prisma.propertyImage.aggregate({
            where: { propertyId },
            _max: { order: true },
        });
        let order = maxOrder._max.order || 0;

        for (const file of files) {
            const { url } = await this.cloudinaryService.uploadPropertyImage(
                file.buffer,
                file.originalname,
            );

            const image = await this.prisma.propertyImage.create({
                data: {
                    propertyId,
                    url,
                    order: ++order,
                },
            });

            uploadedImages.push(image);
        }

        return uploadedImages;
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
