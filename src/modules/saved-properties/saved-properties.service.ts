import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { SavedPropertyRepo } from '@common/repos/saved-property.repo';
import { PropertyRepo } from '@common/repos/property.repo';
import { SavedSearchRepo } from '@common/repos/saved-search.repo';
import { scoreProperty } from '@modules/saved-searches/saved-searches.service';

const SAVED_INCLUDE = {
    property: {
        include: {
            images: { orderBy: { order: 'asc' } },
            seller: { select: { id: true, fullName: true, avatar: true } },
            _count: { select: { savedBy: true } },
        },
    },
} satisfies Prisma.SavedPropertyInclude;

type SearchRecord = Prisma.SavedSearchGetPayload<object>;
type ScoredProperty = Parameters<typeof scoreProperty>[1];

const bestMatch = (searches: SearchRecord[], property: ScoredProperty) =>
    searches.length === 0
        ? { score: 0, facets: [] }
        : searches
              .map((search) => scoreProperty(search, property))
              .reduce((best, current) =>
                  current.score > best.score ? current : best,
              );

@Injectable()
export class SavedPropertiesService {
    constructor(
        private savedPropertyRepo: SavedPropertyRepo,
        private propertyRepo: PropertyRepo,
        private savedSearchRepo: SavedSearchRepo,
    ) {}

    async findAll(buyerId: string) {
        const [saved, searches] = await Promise.all([
            this.savedPropertyRepo.findMany({
                where: { buyerId },
                include: SAVED_INCLUDE,
                orderBy: { createdAt: 'desc' },
            }),
            this.savedSearchRepo.findMany({ where: { buyerId } }),
        ]);

        return saved.map((entry) => ({
            ...entry,
            ...bestMatch(searches, entry.property),
        }));
    }

    async findIds(buyerId: string) {
        const saved = await this.savedPropertyRepo.findMany({
            where: { buyerId },
            select: { propertyId: true },
        });
        return saved.map((entry) => entry.propertyId);
    }

    async save(buyerId: string, propertyId: string) {
        const property = await this.propertyRepo.findUnique({
            where: { id: propertyId },
        });
        if (!property) {
            throw new NotFoundException(
                `Property with ID ${propertyId} not found`,
            );
        }

        const existing = await this.savedPropertyRepo.findUnique({
            where: { buyerId_propertyId: { buyerId, propertyId } },
        });
        if (existing) return existing;

        return this.savedPropertyRepo.create({
            data: { buyerId, propertyId },
        });
    }

    async unsave(buyerId: string, propertyId: string) {
        await this.savedPropertyRepo.deleteMany({
            where: { buyerId, propertyId },
        });
        return { removed: true };
    }
}
