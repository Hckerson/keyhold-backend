import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import {
    DOMAIN_DELETIONS,
    type DeletionScope,
} from './seed-steps/deletion-order';

const KEEP_EMAILS: readonly string[] = [
    'hckerson@gmail.com',
    'probe-buyer-1@example.com',
    'probe-agent-1@example.com',
];

const EVERYTHING: DeletionScope = {};

const METRIC_TABLE = 'ServiceMetric';

const USER_TABLE = 'User';

const LABEL_WIDTH = 28;

const COUNT_WIDTH = 6;

const TRANSACTION_TIMEOUT_MS = 240_000;

const TRANSACTION_MAX_WAIT_MS = 30_000;

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter });

const report = (message: string) => process.stdout.write(`${message}\n`);

const line = (label: string, rows: number) =>
    report(
        `  ${label.padEnd(LABEL_WIDTH)} ${String(rows).padStart(COUNT_WIDTH)}`,
    );

const countRows = async (keepIds: string[]) => {
    const tables = [
        ...DOMAIN_DELETIONS.map((step) => step.table),
        METRIC_TABLE,
    ];
    const union = [
        ...tables.map(
            (table) =>
                `SELECT '${table}' AS table_name, count(*)::int AS row_count FROM "${table}"`,
        ),
        `SELECT '${USER_TABLE}' AS table_name, count(*)::int AS row_count FROM "${USER_TABLE}" WHERE NOT (id = ANY($1::text[]))`,
    ].join(' UNION ALL ');

    const rows = await prisma.$queryRawUnsafe<
        { table_name: string; row_count: number }[]
    >(union, keepIds);
    const byTable = new Map(rows.map((row) => [row.table_name, row.row_count]));

    return [...tables, USER_TABLE].map((table) => ({
        table,
        rows: byTable.get(table) ?? 0,
    }));
};

const purge = async (keepIds: string[]): Promise<number> =>
    prisma.$transaction(
        async (tx) => {
            let removed = 0;

            for (const step of DOMAIN_DELETIONS) {
                const result = await step.remove(tx, EVERYTHING);
                removed += result.count;
            }

            const metrics = await tx.serviceMetric.deleteMany({});
            const users = await tx.user.deleteMany({
                where: { id: { notIn: keepIds } },
            });

            return removed + metrics.count + users.count;
        },
        {
            timeout: TRANSACTION_TIMEOUT_MS,
            maxWait: TRANSACTION_MAX_WAIT_MS,
        },
    );

const main = async () => {
    const confirmed = process.argv.includes('--yes');

    const keepers = await prisma.user.findMany({
        where: { email: { in: [...KEEP_EMAILS] } },
        select: { id: true, email: true, role: true },
    });

    const missing = KEEP_EMAILS.filter(
        (email) => !keepers.some((keeper) => keeper.email === email),
    );

    if (missing.length > 0) {
        throw new Error(
            `Refusing to purge, these accounts are not in the database: ${missing.join(', ')}`,
        );
    }

    const keepIds = keepers.map((keeper) => keeper.id);
    const counts = await countRows(keepIds);
    const total = counts.reduce((sum, entry) => sum + entry.rows, 0);

    report('Rows that will be deleted:');
    for (const entry of counts.filter((entry) => entry.rows > 0)) {
        line(entry.table, entry.rows);
    }
    line('TOTAL', total);

    report('');
    report('Accounts that will be kept:');
    for (const keeper of keepers) {
        report(`  ${keeper.email} (${keeper.role})`);
    }
    report('');
    report('Platform settings are kept.');
    report('');

    if (!confirmed) {
        report(
            'Preview only, nothing was deleted. Re-run with --yes to apply.',
        );
        return;
    }

    const removed = await purge(keepIds);

    report(
        `Purged ${removed} rows. ${keepers.length} accounts and the platform settings remain.`,
    );
};

main()
    .catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : String(error);
        process.stderr.write(`Purge failed, no rows were deleted: ${detail}\n`);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
