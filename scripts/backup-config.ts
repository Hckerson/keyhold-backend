import 'dotenv/config';
import { resolve } from 'node:path';

const POOLED_HOST = 'pooled.db.prisma.io';
const DIRECT_HOST = 'db.prisma.io';

export const BACKUP_DIR = resolve(
    process.env['BACKUP_DIR'] ?? resolve(process.cwd(), 'backups'),
);

export const RETENTION_DAYS = Number(
    process.env['BACKUP_RETENTION_DAYS'] ?? 30,
);

export const requireDatabaseUrl = (): string => {
    const url = process.env['DATABASE_URL'];
    if (!url) {
        throw new Error(
            'DATABASE_URL is not set. Backup and restore both read it from the environment.',
        );
    }
    return url;
};

export const toDirectUrl = (url: string): string =>
    url.includes(POOLED_HOST) ? url.replace(POOLED_HOST, DIRECT_HOST) : url;

export const requireDirectUrl = (): string =>
    process.env['DIRECT_DATABASE_URL'] ?? toDirectUrl(requireDatabaseUrl());

export const stampedName = (at: Date): string =>
    `real-estate-${at.toISOString().replace(/[:.]/g, '-')}.dump`;

export const isExpired = (name: string, now: Date): boolean => {
    const stamp = /^real-estate-(.+)\.dump$/.exec(name)?.[1];
    if (!stamp) return false;

    const iso = stamp.replace(
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/,
        '$1-$2-$3T$4:$5:$6.$7Z',
    );
    const takenAt = new Date(iso);
    if (Number.isNaN(takenAt.getTime())) return false;

    const ageDays = (now.getTime() - takenAt.getTime()) / 86_400_000;
    return ageDays > RETENTION_DAYS;
};
