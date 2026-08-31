import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { BACKUP_DIR, requireDirectUrl } from './backup-config';

const PRODUCTION_ACK = 'RESTORE_OVER_PRODUCTION';

const latestBackup = (): string => {
    const dumps = readdirSync(BACKUP_DIR)
        .filter((name) => name.endsWith('.dump'))
        .sort();
    const newest = dumps.at(-1);
    if (!newest) {
        throw new Error(`No .dump files found in ${BACKUP_DIR}.`);
    }
    return join(BACKUP_DIR, newest);
};

const resolveSource = (argument: string | undefined): string => {
    if (!argument) return latestBackup();
    const path = isAbsolute(argument)
        ? argument
        : join(process.cwd(), argument);
    if (!existsSync(path)) {
        throw new Error(`Backup file not found: ${path}`);
    }
    return path;
};

const run = () => {
    const url = requireDirectUrl();
    const source = resolveSource(process.argv[2]);

    if (
        process.env['NODE_ENV'] === 'production' &&
        process.env['RESTORE_ACK'] !== PRODUCTION_ACK
    ) {
        throw new Error(
            `Refusing to restore over a production database. Set RESTORE_ACK=${PRODUCTION_ACK} to override.`,
        );
    }

    const restore = spawnSync(
        'pg_restore',
        [
            '--clean',
            '--if-exists',
            '--no-owner',
            '--no-privileges',
            '--single-transaction',
            '--dbname',
            url,
            source,
        ],
        { stdio: 'inherit' },
    );

    if (restore.error) {
        throw new Error(
            `pg_restore could not be started: ${restore.error.message}. Install the PostgreSQL client tools and make sure pg_restore is on PATH.`,
        );
    }
    if (restore.status !== 0) {
        throw new Error(
            `pg_restore exited with status ${String(restore.status)}. --single-transaction means nothing was applied.`,
        );
    }

    process.stdout.write(`Restored ${source}\n`);
};

run();
