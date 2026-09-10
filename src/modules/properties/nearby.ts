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

const asRecord = (value: unknown): Record<string, unknown> | null =>
    typeof value === 'object' && value !== null
        ? (value as Record<string, unknown>)
        : null;

const asString = (value: unknown): string | null =>
    typeof value === 'string' ? value : null;

const asNumber = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;

const kindOf = (tags: Record<string, unknown>): PoiKind | null => {
    if (asString(tags['amenity']) === 'school') return 'school';
    if (asString(tags['railway']) === 'station') return 'transit';
    if (asString(tags['leisure']) === 'park') return 'park';
    if (asString(tags['amenity']) === 'restaurant') return 'restaurant';
    return null;
};

const positionOf = (
    element: Record<string, unknown>,
): { latitude: number; longitude: number } | null => {
    const direct = {
        latitude: asNumber(element['lat']),
        longitude: asNumber(element['lon']),
    };
    if (direct.latitude !== null && direct.longitude !== null) {
        return { latitude: direct.latitude, longitude: direct.longitude };
    }

    const centre = asRecord(element['center']);
    if (!centre) return null;

    const latitude = asNumber(centre['lat']);
    const longitude = asNumber(centre['lon']);
    return latitude !== null && longitude !== null
        ? { latitude, longitude }
        : null;
};

export const parseOverpass = (payload: unknown): NearbyPlace[] => {
    const root = asRecord(payload);
    const elements = root?.['elements'];
    if (!Array.isArray(elements)) return [];

    return elements.flatMap((raw) => {
        const element = asRecord(raw);
        if (!element) return [];

        const tags = asRecord(element['tags']);
        const name = tags ? asString(tags['name']) : null;
        if (!tags || !name) return [];

        const kind = kindOf(tags);
        const position = positionOf(element);
        const id = asNumber(element['id']);
        if (!kind || !position || id === null) return [];

        return [
            {
                id: `${asString(element['type']) ?? 'node'}-${id}`,
                kind,
                name,
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
