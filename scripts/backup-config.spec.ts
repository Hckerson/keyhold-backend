import { isExpired, stampedName, toDirectUrl } from './backup-config';

const NOW = new Date('2026-08-27T12:00:00.000Z');

const daysAgo = (days: number) =>
    stampedName(new Date(NOW.getTime() - days * 86_400_000));

describe('backup retention', () => {
    it('keeps a backup taken inside the retention window', () => {
        expect(isExpired(daysAgo(29), NOW)).toBe(false);
    });

    it('expires a backup older than the retention window', () => {
        expect(isExpired(daysAgo(31), NOW)).toBe(true);
    });

    it('never expires a file it cannot date, rather than deleting it', () => {
        expect(isExpired('notes.txt', NOW)).toBe(false);
        expect(isExpired('real-estate-unparseable.dump', NOW)).toBe(false);
    });

    it('names backups so that lexical order is chronological order', () => {
        const older = stampedName(new Date('2026-08-01T09:00:00.000Z'));
        const newer = stampedName(new Date('2026-08-27T09:00:00.000Z'));
        expect([newer, older].sort().at(-1)).toBe(newer);
    });
});

describe('connection endpoint', () => {
    it('rewrites a pooled Prisma Postgres host to the direct one pg_dump requires', () => {
        expect(
            toDirectUrl(
                'postgres://user:secret@pooled.db.prisma.io:5432/postgres?sslmode=require',
            ),
        ).toBe(
            'postgres://user:secret@db.prisma.io:5432/postgres?sslmode=require',
        );
    });

    it('leaves a connection string that is already direct untouched', () => {
        const direct =
            'postgres://user:secret@db.prisma.io:5432/postgres?sslmode=require';
        expect(toDirectUrl(direct)).toBe(direct);
    });

    it('leaves a self-hosted connection string untouched', () => {
        const local =
            'postgresql://user:password@localhost:5432/real_estate_db';
        expect(toDirectUrl(local)).toBe(local);
    });
});
