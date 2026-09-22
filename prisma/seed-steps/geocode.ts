import { PrismaClient } from '../../generated/prisma/client';
import {
    GEOCODE_INTERVAL_MS,
    geocode,
    type GeocodeTarget,
} from '../seed-data/geocode';
import { SEED_PREFIX } from '../seed-data/ids';

export interface PlacementSummary {
    placed: number;
    unplaced: number;
}

const wait = (ms: number) =>
    new Promise((resolve) => {
        setTimeout(resolve, ms);
    });

export const placeProperties = async (
    prisma: PrismaClient,
    onProgress?: (target: GeocodeTarget, placed: boolean) => void,
): Promise<PlacementSummary> => {
    const pending = await prisma.property.findMany({
        where: {
            id: { startsWith: `${SEED_PREFIX}prop-` },
            OR: [{ latitude: null }, { longitude: null }],
        },
        select: {
            id: true,
            address: true,
            locality: true,
            region: true,
            postalCode: true,
        },
    });

    let placed = 0;

    for (const [index, property] of pending.entries()) {
        if (index > 0) await wait(GEOCODE_INTERVAL_MS);

        const point = await geocode(property);

        if (point) {
            await prisma.property.update({
                where: { id: property.id },
                data: point,
            });
            placed += 1;
        }

        onProgress?.(property, point !== null);
    }

    return { placed, unplaced: pending.length - placed };
};
