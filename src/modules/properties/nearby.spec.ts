import {
    countByKind,
    overpassQuery,
    parseOverpass,
    NEARBY_RADIUS_METRES,
} from './nearby';

describe('overpassQuery', () => {
    it('asks for all four kinds around the given point', () => {
        const query = overpassQuery(34.0736, -118.4004);

        expect(query).toContain(
            `(around:${NEARBY_RADIUS_METRES},34.0736,-118.4004)`,
        );
        expect(query).toContain('["amenity"="school"]');
        expect(query).toContain('["railway"="station"]');
        expect(query).toContain('["leisure"="park"]');
        expect(query).toContain('["amenity"="restaurant"]');
    });
});

describe('parseOverpass', () => {
    it('reads a node that carries its own coordinates', () => {
        const places = parseOverpass({
            elements: [
                {
                    type: 'node',
                    id: 1,
                    lat: 34.07,
                    lon: -118.4,
                    tags: { amenity: 'school', name: 'Beverly Vista' },
                },
            ],
        });

        expect(places).toEqual([
            {
                id: 'node-1',
                kind: 'school',
                name: 'Beverly Vista',
                latitude: 34.07,
                longitude: -118.4,
            },
        ]);
    });

    it('falls back to the centre of a way that has no direct coordinates', () => {
        const places = parseOverpass({
            elements: [
                {
                    type: 'way',
                    id: 2,
                    center: { lat: 34.08, lon: -118.41 },
                    tags: { leisure: 'park', name: 'Roxbury Park' },
                },
            ],
        });

        expect(places[0]).toMatchObject({
            id: 'way-2',
            kind: 'park',
            latitude: 34.08,
        });
    });

    it('drops an element with no name rather than rendering an unlabelled pin', () => {
        const places = parseOverpass({
            elements: [
                {
                    type: 'node',
                    id: 3,
                    lat: 1,
                    lon: 2,
                    tags: { leisure: 'park' },
                },
            ],
        });

        expect(places).toEqual([]);
    });

    it('drops an element whose tags match no requested kind', () => {
        const places = parseOverpass({
            elements: [
                {
                    type: 'node',
                    id: 4,
                    lat: 1,
                    lon: 2,
                    tags: { amenity: 'bench', name: 'A bench' },
                },
            ],
        });

        expect(places).toEqual([]);
    });

    it('returns nothing for a payload that is not shaped like a response', () => {
        expect(parseOverpass(null)).toEqual([]);
        expect(parseOverpass({ elements: 'nope' })).toEqual([]);
        expect(parseOverpass({})).toEqual([]);
    });
});

describe('countByKind', () => {
    it('reports a zero for a kind that returned nothing', () => {
        const counts = countByKind([
            {
                id: 'node-1',
                kind: 'school',
                name: 'One',
                latitude: 1,
                longitude: 2,
            },
        ]);

        expect(counts).toEqual({
            school: 1,
            transit: 0,
            park: 0,
            restaurant: 0,
        });
    });
});
