import { z } from 'zod';

export const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';

export const GEOCODE_INTERVAL_MS = 1100;

export const GEOCODE_TIMEOUT_MS = 20_000;

const DEFAULT_USER_AGENT = 'keyhol.me-seed/1.0 (support@keyhol.me)';

const ADDRESS_PLACE_RANK = 30;

const ADDRESS_CLASSES: readonly string[] = ['place', 'building'];

export interface GeoPoint {
    latitude: number;
    longitude: number;
}

export interface GeocodeTarget {
    address: string;
    locality: string;
    region: string;
    postalCode: string;
}

const nominatimResponseSchema = z.array(
    z.object({
        lat: z.coerce.number(),
        lon: z.coerce.number(),
        class: z.string(),
        place_rank: z.number(),
    }),
);

export const geocodeQuery = (target: GeocodeTarget): string =>
    `${target.address}, ${target.locality}, ${target.region} ${target.postalCode}`;

export const parseGeocode = (payload: unknown): GeoPoint | null => {
    const parsed = nominatimResponseSchema.safeParse(payload);
    const match = parsed.success ? parsed.data[0] : undefined;

    if (
        !match ||
        match.place_rank !== ADDRESS_PLACE_RANK ||
        !ADDRESS_CLASSES.includes(match.class)
    ) {
        return null;
    }

    return { latitude: match.lat, longitude: match.lon };
};

export const geocode = async (
    target: GeocodeTarget,
): Promise<GeoPoint | null> => {
    const url = new URL(NOMINATIM_ENDPOINT);
    url.searchParams.set('q', geocodeQuery(target));
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent':
                    process.env['GEOCODER_USER_AGENT'] ?? DEFAULT_USER_AGENT,
            },
            signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS),
        });

        return response.ok ? parseGeocode(await response.json()) : null;
    } catch {
        return null;
    }
};
