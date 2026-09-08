import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { coordinatesFor } from './seed-data/coordinates';
import { SEED_PREFIX } from './seed-data/ids';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter });

const report = (message: string) => process.stdout.write(`${message}\n`);

const keyOf = (id: string) => id.slice(`${SEED_PREFIX}prop-`.length);

const main = async () => {
    const pending = await prisma.property.findMany({
        where: {
            id: { startsWith: `${SEED_PREFIX}prop-` },
            OR: [{ latitude: null }, { longitude: null }],
        },
        select: { id: true, locality: true },
    });

    report(`${pending.length} seed properties without coordinates.`);

    let written = 0;
    const unplaced = new Set<string>();

    for (const property of pending) {
        const placed = coordinatesFor(property.locality, keyOf(property.id));

        if (!placed) {
            unplaced.add(property.locality);
            continue;
        }

        await prisma.property.update({
            where: { id: property.id },
            data: placed,
        });
        written += 1;
    }

    report(`Placed ${written} properties.`);

    if (unplaced.size > 0) {
        report(
            `No centre defined for: ${[...unplaced].join(', ')}. Add them to seed-data/coordinates.ts.`,
        );
    }
};

main()
    .catch((error: unknown) => {
        report(String(error));
        process.exitCode = 1;
    })
    .finally(() => void prisma.$disconnect());
