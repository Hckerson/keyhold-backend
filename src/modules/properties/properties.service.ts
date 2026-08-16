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
} from './dto';
import { PropertyStatus } from '@generated/prisma/enums';

const LIST_INCLUDE = {
    images: { orderBy: { order: 'asc' } },
    seller: { select: { id: true, fullName: true, avatar: true } },
    _count: { select: { savedBy: true } },
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
    };

const DEFAULT_LIMIT = 20;

@Injectable()
export class PropertiesService {
    constructor(
        private propertyRepo: PropertyRepo,
        private cloudinaryService: CloudinaryService,
        private prisma: PrismaService,
    ) {}

    private buildWhere(
        filters: QueryPropertyDto & { sellerId?: string },
    ): Prisma.PropertyWhereInput {
        const { q } = filters;
        return {
            status: filters.status,
            type: filters.type,
            sellerId: filters.sellerId,
            locality: filters.locality
                ? { equals: filters.locality, mode: 'insensitive' }
                : undefined,
            price:
                filters.minPrice !== undefined || filters.maxPrice !== undefined
                    ? { gte: filters.minPrice, lte: filters.maxPrice }
                    : undefined,
            bedrooms:
                filters.bedrooms !== undefined
                    ? { gte: filters.bedrooms }
                    : undefined,
            bathrooms:
                filters.bathrooms !== undefined
                    ? { gte: filters.bathrooms }
                    : undefined,
            sqFt:
                filters.minSqFt !== undefined
                    ? { gte: filters.minSqFt }
                    : undefined,
            OR: q
                ? [
                      { title: { contains: q, mode: 'insensitive' } },
                      { description: { contains: q, mode: 'insensitive' } },
                      { address: { contains: q, mode: 'insensitive' } },
                      { locality: { contains: q, mode: 'insensitive' } },
                  ]
                : undefined,
        };
    }

    async findAll(filters: QueryPropertyDto & { sellerId?: string } = {}) {
        const page = filters.page ?? 1;
        const limit = filters.limit ?? DEFAULT_LIMIT;
        const where = this.buildWhere(filters);

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

    async findBySeller(sellerId: string, filters: QueryPropertyDto = {}) {
        return this.findAll({ ...filters, sellerId });
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
