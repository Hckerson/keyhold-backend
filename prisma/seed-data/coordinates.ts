export interface LocalityCentre {
    latitude: number;
    longitude: number;
}

export const LOCALITY_CENTRES: Record<string, LocalityCentre> = {
    'Beverly Hills': { latitude: 34.0736, longitude: -118.4004 },
    'Bel Air': { latitude: 34.09, longitude: -118.459 },
    'Santa Monica': { latitude: 34.0195, longitude: -118.4912 },
    Malibu: { latitude: 34.0259, longitude: -118.7798 },
    'Pacific Heights': { latitude: 37.7925, longitude: -122.4382 },
    Brentwood: { latitude: 34.052, longitude: -118.473 },
    'Hidden Hills': { latitude: 34.1642, longitude: -118.652 },
    'Holmby Hills': { latitude: 34.0764, longitude: -118.429 },
};

const SPREAD_DEGREES = 0.012;
const LATITUDE_STEP = 2_654_435_761;
const LONGITUDE_STEP = 1_779_033_703;
const HASH_MODULUS = 2 ** 32;
const PRECISION = 6;

const unitOffset = (key: string, step: number) => {
    let hash = 0;
    for (const character of key) {
        hash = (hash * 31 + character.charCodeAt(0)) % HASH_MODULUS;
    }
    return (((hash * step) % HASH_MODULUS) / HASH_MODULUS) * 2 - 1;
};

const round = (value: number) => Number(value.toFixed(PRECISION));

export const coordinatesFor = (
    locality: string,
    key: string,
): LocalityCentre | null => {
    const centre = LOCALITY_CENTRES[locality];
    if (!centre) return null;

    return {
        latitude: round(
            centre.latitude + unitOffset(key, LATITUDE_STEP) * SPREAD_DEGREES,
        ),
        longitude: round(
            centre.longitude + unitOffset(key, LONGITUDE_STEP) * SPREAD_DEGREES,
        ),
    };
};
