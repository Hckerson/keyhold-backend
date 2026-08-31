import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
    BACKUP_DIR,
    RETENTION_DAYS,
    isExpired,
    requireDirectUrl,
    stampedName,
} from './backup-config';

const run = () => {
    const url = requireDirectUrl();
    mkdirSync(BACKUP_DIR, { recursive: true });

    const target = join(BACKUP_DIR, stampedName(new Date()));

    const dump = spawnSync(
        'pg_dump',
        [
            '--format=custom',
            '--no-owner',
            '--no-privileges',
            '--file',
            target,
            url,
        ],
        { stdio: 'inherit' },
    );

    if (dump.error) {
        throw new Error(
            `pg_dump could not be started: ${dump.error.message}. Install the PostgreSQL client tools and make sure pg_dump is on PATH.`,
        );
    }
    if (dump.status !== 0) {
        throw new Error(`pg_dump exited with status ${String(dump.status)}.`);
    }

    const bytes = statSync(target).size;
    if (bytes === 0) {
        rmSync(target);
        throw new Error(
            'pg_dump produced an empty file; the backup was discarded.',
        );
    }

    const now = new Date();
    const pruned = readdirSync(BACKUP_DIR).filter((name) =>
        isExpired(name, now),
    );
    for (const name of pruned) rmSync(join(BACKUP_DIR, name));

    process.stdout.write(
        `${target}\n${String(bytes)} bytes\n${String(pruned.length)} expired backup(s) pruned beyond ${String(RETENTION_DAYS)} days\n`,
    );
};

run();
