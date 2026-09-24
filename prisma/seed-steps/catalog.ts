import { Prisma, PropertyStatus } from '../../generated/prisma/client';
import { gallery } from '../seed-data/images';
import { DAYS_PER_MONTH, daysAgo, seedId } from '../seed-data/ids';
import {
    AMENITIES_PER_PROPERTY,
    AMENITY_POOL,
    CLOSING_LINE,
    FEATURES_PER_PROPERTY,
    FEATURE_POOL,
    GALLERY_SIZE,
    PROPERTY_SEEDS,
} from '../seed-data/properties';
import type { PropertySeed } from '../seed-data/types';
import type { SeededBuyer } from './people';

const VIEWS_PER_SAVE = 13;

const VIEWS_FLOOR = 180;

export interface SeededProperty {
    id: string;
    seed: PropertySeed;
    sellerId: string;
    createdAt: Date;
    savers: SeededBuyer[];
}

const rotate = <T>(items: readonly T[], offset: number, count: number): T[] =>
    Array.from(
        { length: Math.min(count, items.length) },
        (_, index) => items[(offset + index) % items.length],
    );

const cycleFrom = (
    pool: readonly string[],
    offset: number,
    count: number,
): string[] =>
    Array.from(
        { length: count },
        (_, index) => pool[(offset + index) % pool.length],
    );

export const seedCatalog = async (
    tx: Prisma.TransactionClient,
    now: Date,
    sellerIdByKey: Map<string, string>,
    buyers: SeededBuyer[],
): Promise<SeededProperty[]> => {
    let saveOffset = 0;

    const soldAtFor = (seed: PropertySeed) =>
        seed.status === PropertyStatus.SOLD && seed.soldMonthsAgo
            ? daysAgo(now, seed.soldMonthsAgo * DAYS_PER_MONTH)
            : null;

    const properties = PROPERTY_SEEDS.map((seed) => {
        const sellerId = sellerIdByKey.get(seed.agentKey);
        if (!sellerId) {
            throw new Error(`Unknown agent key ${seed.agentKey}`);
        }

        const createdAt = daysAgo(now, seed.listedDaysAgo);
        const savers = rotate(buyers, saveOffset, seed.saves);
        saveOffset = (saveOffset + seed.saves) % buyers.length;

        return {
            id: seedId('prop', seed.key),
            seed,
            sellerId,
            createdAt,
            savers,
        } satisfies SeededProperty;
    });

    await tx.property.createMany({
        data: properties.map(({ id, seed, sellerId, createdAt }) => ({
            id,
            title: seed.title,
            description: `${seed.blurb} ${CLOSING_LINE}`,
            address: seed.address,
            locality: seed.locality,
            region: seed.region,
            postalCode: seed.postalCode,
            price: seed.price,
            bedrooms: seed.bedrooms,
            bathrooms: seed.bathrooms,
            sqFt: seed.sqFt,
            lotSqFt: seed.lotSqFt,
            yearBuilt: seed.yearBuilt,
            walkScore: seed.walkScore,
            viewsCount: VIEWS_FLOOR + seed.saves * VIEWS_PER_SAVE,
            amenities: cycleFrom(
                AMENITY_POOL,
                seed.featureOffset,
                AMENITIES_PER_PROPERTY,
            ),
            features: cycleFrom(
                FEATURE_POOL,
                seed.featureOffset,
                FEATURES_PER_PROPERTY,
            ),
            type: seed.type,
            status: seed.status,
            sellerId,
            createdAt,
            soldAt: soldAtFor(seed),
            updatedAt: soldAtFor(seed) ?? createdAt,
        })),
    });

    await tx.propertyImage.createMany({
        data: properties.flatMap(({ id, seed, createdAt }) =>
            gallery(seed.imageSeed, GALLERY_SIZE).map((url, order) => ({
                id: seedId('img', seed.key, order),
                url,
                order,
                propertyId: id,
                createdAt,
            })),
        ),
    });

    await tx.savedProperty.createMany({
        data: properties.flatMap(({ id, seed, savers }) =>
            savers.map((buyer, index) => ({
                id: seedId('saved', seed.key, index),
                buyerId: buyer.id,
                propertyId: id,
                createdAt: daysAgo(
                    now,
                    Math.max(1, seed.listedDaysAgo - (index % 30)),
                ),
            })),
        ),
    });

    return properties;
};
