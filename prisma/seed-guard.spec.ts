import { assertSeedTarget } from './seed-guard';

const LOCAL = 'postgres://postgres:postgres@localhost:51214/template1';
const REMOTE = 'postgres://user:pass@pooled.db.prisma.io:5432/postgres';

describe('the seed target guard', () => {
    const environment = process.env['NODE_ENV'];

    afterEach(() => {
        delete process.env['SEED_ACK'];
        process.env['NODE_ENV'] = environment;
    });

    it('allows a database on this machine', () => {
        expect(assertSeedTarget(LOCAL)).toBe('localhost');
        expect(assertSeedTarget('postgres://u:p@127.0.0.1:5432/db')).toBe(
            '127.0.0.1',
        );
    });

    it('refuses a hosted database, naming the host it refused', () => {
        expect(() => assertSeedTarget(REMOTE)).toThrow(
            /Refusing to seed pooled\.db\.prisma\.io/,
        );
    });

    it('tells the caller how to get a local database instead of just failing', () => {
        expect(() => assertSeedTarget(REMOTE)).toThrow(/pnpm db:dev/);
    });

    it('lets a deliberate override through, and only the exact one', () => {
        process.env['SEED_ACK'] = 'SEED_REMOTE_DATABASE';
        expect(assertSeedTarget(REMOTE)).toBe('pooled.db.prisma.io');

        process.env['SEED_ACK'] = 'yes';
        expect(() => assertSeedTarget(REMOTE)).toThrow(/Refusing to seed/);
    });

    it('refuses a production environment even on a local database', () => {
        process.env['NODE_ENV'] = 'production';
        expect(() => assertSeedTarget(LOCAL)).toThrow(/production/);
    });

    it('refuses a production environment even with the remote override set', () => {
        process.env['NODE_ENV'] = 'production';
        process.env['SEED_ACK'] = 'SEED_REMOTE_DATABASE';
        expect(() => assertSeedTarget(REMOTE)).toThrow(/production/);
    });

    it('refuses to guess when no database is configured', () => {
        expect(() => assertSeedTarget(undefined)).toThrow(/DATABASE_URL/);
        expect(() => assertSeedTarget('')).toThrow(/DATABASE_URL/);
    });
});
