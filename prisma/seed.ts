import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';
import { PrismaPg } from '@prisma/adapter-pg';
import {
    Day,
    Month,
    Prisma,
    UserRole,
    PrismaClient,
    UserAccountStatus,
} from '../generated/prisma/client';

// Run with: npx tsx prisma/seed.ts

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function sqlRollback() {
    console.error('\n🔄 Rolling back database...');
    try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "User" CASCADE;`);
        console.error('✓ Database rolled back successfully');
    } catch (error) {
        console.error('❌ Rollback failed:', error);
        console.error('Manual cleanup required. Run: npx prisma migrate reset');
    }
}

function buildUser(overrides: Partial<Prisma.UserCreateInput>) {
    return {
        fullName: faker.person.fullName(),
        email: faker.internet.email(),
        passwordHash: bcrypt.hashSync('password123', 10),
        avatar: faker.image.avatar(),
        bio: faker.lorem.sentence(),
        phoneNumber: faker.phone.number(),
        role: UserRole.BUYER,
        status: faker.helpers.enumValue(UserAccountStatus),
        lastActive: faker.date.recent(),
        month: faker.helpers.enumValue(Month),
        day: faker.helpers.enumValue(Day),
        year: faker.number.int({ min: 2020, max: 2025 }),
        ...overrides,
    } satisfies Prisma.UserCreateInput;
}

async function main() {
    try {
        console.log('Seeding database...');

        await prisma.user.create({
            data: buildUser({
                fullName: 'Admin User',
                email: 'admin@example.com',
                role: UserRole.ADMIN,
                status: UserAccountStatus.ACTIVE,
            }),
        });

        for (let i = 0; i < 20; i++) {
            await prisma.user.create({ data: buildUser({}) });
        }

        console.log('\n✅ Database seeding completed successfully!');
    } catch (error) {
        console.error('\n❌ Seeding failed:', error);
        await sqlRollback();
        process.exit(1);
    }
}

main()
    .catch((err) => {
        console.error('Unexpected error:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
