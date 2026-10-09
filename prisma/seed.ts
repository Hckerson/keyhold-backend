import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { AGENT_SEEDS } from './seed-data/agents';
import { seedCatalog } from './seed-steps/catalog';
import { seedDeals } from './seed-steps/deals';
import { placeProperties } from './seed-steps/geocode';
import { ADMIN_EMAIL, BUYER_EMAIL, seedPeople } from './seed-steps/people';
import { seedPlatform } from './seed-steps/platform';
import { seedReports } from './seed-steps/reports';
import { resetSeed } from './seed-steps/reset';
import { assertSeedTarget } from './seed-guard';

const DEMO_PASSWORD = 'password123';
const BCRYPT_ROUNDS = 10;
const FAKER_SEED = 20260823;
const TRANSACTION_TIMEOUT_MS = 240_000;
const TRANSACTION_MAX_WAIT_MS = 30_000;

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter });

const report = (message: string) => process.stdout.write(`${message}\n`);

const main = async () => {
    const host = assertSeedTarget(process.env['DATABASE_URL']);
    report(`Seeding ${host}.`);

    const shouldReset = process.argv.includes('--reset');
    const now = new Date();

    faker.seed(FAKER_SEED);
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

    const summary = await prisma.$transaction(
        async (tx) => {
            const removed = shouldReset ? await resetSeed(tx) : 0;

            const { adminId, sellerIdByKey, buyers } = await seedPeople(
                tx,
                now,
                passwordHash,
            );
            const sellerIds = [...sellerIdByKey.values()];

            const properties = await seedCatalog(
                tx,
                now,
                sellerIdByKey,
                buyers,
            );
            const { threads, transactionCount } = await seedDeals(
                tx,
                now,
                properties,
            );
            await seedPlatform(tx, now, adminId, sellerIds, buyers, properties);
            const reports = await seedReports(
                tx,
                now,
                sellerIds,
                buyers,
                threads,
            );

            return {
                removed,
                users: buyers.length + sellerIds.length + 1,
                properties: properties.length,
                saves: properties.reduce(
                    (total, property) => total + property.savers.length,
                    0,
                ),
                connections: threads.length,
                transactions: transactionCount,
                reports,
            };
        },
        {
            timeout: TRANSACTION_TIMEOUT_MS,
            maxWait: TRANSACTION_MAX_WAIT_MS,
        },
    );

    if (shouldReset) {
        report(`Removed ${summary.removed} previously seeded rows.`);
    }

    report(
        `Seeded ${summary.users} users, ${summary.properties} properties, ${summary.saves} saves, ${summary.connections} connections, ${summary.transactions} transactions and ${summary.reports} member and message reports.`,
    );

    const placement = await placeProperties(prisma);
    report(
        `Geocoded ${placement.placed} properties to an exact address; ${placement.unplaced} stayed unplaced and are not drawn on any map.`,
    );
    report(
        `Sign in with ${ADMIN_EMAIL}, ${BUYER_EMAIL} or ${AGENT_SEEDS[0].email} using ${DEMO_PASSWORD}.`,
    );
};

main()
    .catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : String(error);
        process.stderr.write(
            `Seeding failed, no rows were written: ${detail}\n`,
        );
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
