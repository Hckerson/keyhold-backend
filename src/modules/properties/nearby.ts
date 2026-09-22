import { z } from 'zod';

export const POI_KINDS = ['school', 'transit', 'park', 'restaurant'] as const;

export type PoiKind = (typeof POI_KINDS)[number];

export interface NearbyPlace {
    id: string;
    kind: PoiKind;
    name: string;
    latitude: number;
    longitude: number;
}

export const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
export const NEARBY_RADIUS_METRES = 1500;
export const NEARBY_LIMIT = 80;
export const OVERPASS_TIMEOUT_MS = 8000;

const KIND_QUERY: Record<PoiKind, string> = {
    school: '["amenity"="school"]',
    transit: '["railway"="station"]',
    park: '["leisure"="park"]',
    restaurant: '["amenity"="restaurant"]',
};

export const overpassQuery = (latitude: number, longitude: number): string => {
    const around = `(around:${NEARBY_RADIUS_METRES},${latitude},${longitude})`;
    const clauses = POI_KINDS.map(
        (kind) => `nwr${KIND_QUERY[kind]}${around};`,
    ).join('');

    return `[out:json][timeout:${Math.round(OVERPASS_TIMEOUT_MS / 1000)}];(${clauses});out center tags ${NEARBY_LIMIT};`;
};

const coordinatesSchema = z.object({ lat: z.number(), lon: z.number() });

const elementSchema = z.object({
    type: z.string().optional(),
    id: z.number(),
    lat: z.number().optional(),
    lon: z.number().optional(),
    center: coordinatesSchema.optional(),
    tags: z.object({
        name: z.string().min(1),
        amenity: z.string().optional(),
        railway: z.string().optional(),
        leisure: z.string().optional(),
    }),
});

const responseSchema = z.object({ elements: z.array(z.unknown()) });

type OverpassElement = z.infer<typeof elementSchema>;

const kindOf = (tags: OverpassElement['tags']): PoiKind | null => {
    if (tags.amenity === 'school') return 'school';
    if (tags.railway === 'station') return 'transit';
    if (tags.leisure === 'park') return 'park';
    if (tags.amenity === 'restaurant') return 'restaurant';
    return null;
};

const positionOf = (
    element: OverpassElement,
): { latitude: number; longitude: number } | null => {
    if (element.lat !== undefined && element.lon !== undefined) {
        return { latitude: element.lat, longitude: element.lon };
    }

    return element.center
        ? { latitude: element.center.lat, longitude: element.center.lon }
        : null;
};

export const parseOverpass = (payload: unknown): NearbyPlace[] => {
    const response = responseSchema.safeParse(payload);
    if (!response.success) return [];

    return response.data.elements.flatMap((raw) => {
        const parsed = elementSchema.safeParse(raw);
        if (!parsed.success) return [];

        const element = parsed.data;
        const kind = kindOf(element.tags);
        const position = positionOf(element);
        if (!kind || !position) return [];

        return [
            {
                id: `${element.type ?? 'node'}-${element.id}`,
                kind,
                name: element.tags.name,
                ...position,
            },
        ];
    });
};

export const countByKind = (places: NearbyPlace[]): Record<PoiKind, number> =>
    places.reduce(
        (counts, place) => ({
            ...counts,
            [place.kind]: counts[place.kind] + 1,
        }),
        { school: 0, transit: 0, park: 0, restaurant: 0 },
    );
