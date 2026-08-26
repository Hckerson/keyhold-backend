import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PropertyStatus } from '@generated/prisma/enums';
import { SavedSearchRepo } from '@common/repos/saved-search.repo';
import { PropertyRepo } from '@common/repos/property.repo';
import { CreateSavedSearchDto, UpdateSavedSearchDto } from './dto';

type SavedSearchRecord = Prisma.SavedSearchGetPayload<object>;
type PropertyRecord = Prisma.PropertyGetPayload<object>;

export interface MatchFacet {
    id: string;
    label: string;
    met: boolean;
}

const toNumber = (value: Prisma.Decimal | null) =>
    value === null ? null : value.toNumber();

const facetsFor = (
    search: SavedSearchRecord,
    property: PropertyRecord,
): MatchFacet[] => {
    const facets: MatchFacet[] = [];
    const minPrice = toNumber(search.minPrice);
    const maxPrice = toNumber(search.maxPrice);

    if (minPrice !== null || maxPrice !== null) {
        facets.push({
            id: 'price',
            label: 'Price',
            met:
                (minPrice === null || property.price.gte(minPrice)) &&
                (maxPrice === null || property.price.lte(maxPrice)),
        });
    }
    if (search.locality) {
        facets.push({
            id: 'locality',
            label: 'Locality',
            met:
                property.locality.toLowerCase() ===
                search.locality.toLowerCase(),
        });
    }
    if (search.propertyType) {
        facets.push({
            id: 'type',
            label: 'Property type',
            met: property.type === search.propertyType,
        });
    }
    if (search.minBedrooms !== null) {
        facets.push({
            id: 'bedrooms',
            label: 'Bedrooms',
            met: property.bedrooms >= search.minBedrooms,
        });
    }
    if (search.minBathrooms !== null) {
        facets.push({
            id: 'bathrooms',
            label: 'Bathrooms',
            met: property.bathrooms >= search.minBathrooms,
        });
    }
    if (search.minSqFt !== null) {
        facets.push({
            id: 'sqft',
            label: 'Floor area',
            met: (property.sqFt ?? 0) >= search.minSqFt,
        });
    }
    return facets;
};

export const scoreProperty = (
    search: SavedSearchRecord,
    property: PropertyRecord,
) => {
    const facets = facetsFor(search, property);
    if (facets.length === 0) return { score: 0, facets };
    const met = facets.filter((facet) => facet.met).length;
    return { score: Math.round((met / facets.length) * 100), facets };
};

@Injectable()
export class SavedSearchesService {
    constructor(
        private savedSearchRepo: SavedSearchRepo,
        private propertyRepo: PropertyRepo,
    ) {}

    private shape(search: SavedSearchRecord) {
        return {
            ...search,
            minPrice: toNumber(search.minPrice),
            maxPrice: toNumber(search.maxPrice),
        };
    }

    async findAll(buyerId: string) {
        const searches = await this.savedSearchRepo.findMany({
            where: { buyerId },
            orderBy: { createdAt: 'desc' },
        });
        return searches.map((search) => this.shape(search));
    }

    async findOne(buyerId: string, id: string) {
        const search = await this.savedSearchRepo.findFirst({
            where: { id, buyerId },
        });
        if (!search) {
            throw new NotFoundException(`Saved search with ID ${id} not found`);
        }
        return search;
    }

    async create(buyerId: string, dto: CreateSavedSearchDto) {
        const created = await this.savedSearchRepo.create({
            data: {
                buyerId,
                name: dto.name,
                locality: dto.locality,
                minPrice:
                    dto.minPrice === undefined
                        ? undefined
                        : new Prisma.Decimal(dto.minPrice),
                maxPrice:
                    dto.maxPrice === undefined
                        ? undefined
                        : new Prisma.Decimal(dto.maxPrice),
                minBedrooms: dto.minBedrooms,
                minBathrooms: dto.minBathrooms,
                minSqFt: dto.minSqFt,
                propertyType: dto.propertyType,
                notify: dto.notify,
            },
        });
        return this.shape(created);
    }

    async update(buyerId: string, id: string, dto: UpdateSavedSearchDto) {
        await this.findOne(buyerId, id);
        const updated = await this.savedSearchRepo.update({
            where: { id },
            data: {
                name: dto.name,
                locality: dto.locality,
                minPrice:
                    dto.minPrice === undefined
                        ? undefined
                        : new Prisma.Decimal(dto.minPrice),
                maxPrice:
                    dto.maxPrice === undefined
                        ? undefined
                        : new Prisma.Decimal(dto.maxPrice),
                minBedrooms: dto.minBedrooms,
                minBathrooms: dto.minBathrooms,
                minSqFt: dto.minSqFt,
                propertyType: dto.propertyType,
                notify: dto.notify,
            },
        });
        return this.shape(updated);
    }

    async remove(buyerId: string, id: string) {
        await this.findOne(buyerId, id);
        const removed = await this.savedSearchRepo.delete({ where: { id } });
        return this.shape(removed);
    }

    async matches(buyerId: string, id: string) {
        const search = await this.findOne(buyerId, id);
        const properties = await this.propertyRepo.findMany({
            where: { status: PropertyStatus.AVAILABLE },
            include: { images: { orderBy: { order: 'asc' }, take: 1 } },
        });

        await this.savedSearchRepo.update({
            where: { id },
            data: { lastRunAt: new Date() },
        });

        return properties
            .map((property) => ({
                property,
                ...scoreProperty(search, property),
            }))
            .sort((a, b) => b.score - a.score);
    }

    async scoreFor(buyerId: string, property: PropertyRecord) {
        const searches = await this.savedSearchRepo.findMany({
            where: { buyerId },
        });
        if (searches.length === 0) return { score: 0, facets: [] };

        return searches
            .map((search) => scoreProperty(search, property))
            .reduce((best, current) =>
                current.score > best.score ? current : best,
            );
    }
}
