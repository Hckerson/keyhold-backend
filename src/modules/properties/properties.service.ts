import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { PropertyRepo } from '@common/repos/property.repo';
import { CloudinaryService } from '@common/services/storage/cloudinary.service';
import { PrismaService } from '@common/database/prisma.service';
import { CreatePropertyDto, UpdatePropertyDto } from './dto';
import { PropertyStatus, PropertyType } from '../../../generated/prisma';

@Injectable()
export class PropertiesService {
    constructor(
        private propertyRepo: PropertyRepo,
        private cloudinaryService: CloudinaryService,
        private prisma: PrismaService,
    ) {}

    async findAll(filters?: {
        status?: PropertyStatus;
        type?: PropertyType;
        minPrice?: number;
        maxPrice?: number;
        bedrooms?: number;
        sellerId?: string;
    }) {
        return this.propertyRepo.findMany({
            where: {
                status: filters?.status,
                type: filters?.type,
                price: {
                    gte: filters?.minPrice,
                    lte: filters?.maxPrice,
                },
                bedrooms: filters?.bedrooms,
                sellerId: filters?.sellerId,
            },
            include: {
                images: { orderBy: { order: 'asc' } },
                seller: { select: { id: true, fullName: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const property = await this.propertyRepo.findUnique({
            where: { id },
            include: {
                images: { orderBy: { order: 'asc' } },
                seller: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        phoneNumber: true,
                    },
                },
                connections: {
                    where: { status: 'ACCEPTED' },
                    select: { buyerId: true },
                },
            },
        });
        if (!property) {
            throw new NotFoundException(`Property with ID ${id} not found`);
        }
        return property;
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
            include: {
                images: { orderBy: { order: 'asc' } },
                seller: { select: { id: true, fullName: true, email: true } },
            },
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

    async search(query: string, limit: number = 20) {
        if (!query || query.trim().length < 2) {
            throw new BadRequestException(
                'Search query must be at least 2 characters',
            );
        }
        return this.propertyRepo.findMany({
            where: {
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                    { address: { contains: query, mode: 'insensitive' } },
                ],
                status: PropertyStatus.AVAILABLE,
            },
            include: {
                images: { orderBy: { order: 'asc' }, take: 1 },
                seller: { select: { id: true, fullName: true } },
            },
            take: limit,
        });
    }

    async findBySeller(sellerId: string) {
        return this.propertyRepo.findMany({
            where: { sellerId },
            include: {
                images: { orderBy: { order: 'asc' } },
            },
            orderBy: { createdAt: 'desc' },
        });
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
