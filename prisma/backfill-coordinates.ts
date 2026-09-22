import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { geocodeQuery } from './seed-data/geocode';
import { placeProperties } from './seed-steps/geocode';
import { assertSeedTarget } from './seed-guard';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter });

const report = (message: string) => process.stdout.write(`${message}\n`);

const main = async () => {
    report(`Geocoding ${assertSeedTarget(process.env['DATABASE_URL'])}.`);

    const summary = await placeProperties(prisma, (target, placed) => {
        if (!placed) report(`Unplaced: ${geocodeQuery(target)}`);
    });

    report(`Geocoded ${summary.placed} properties to an exact address.`);
    report(
        `${summary.unplaced} could not be resolved to a building and were left without coordinates.`,
    );
};

main()
    .catch((error: unknown) => {
        report(String(error));
        process.exitCode = 1;
    })
    .finally(() => void prisma.$disconnect());
