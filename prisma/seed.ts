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
    PropertyType,
    PropertyStatus,
    ConnectionStatus,
    UserAccountStatus,
} from '../generated/prisma/client';

// Run with: npx tsx prisma/seed.ts

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SELLER_COUNT = 5;
const BUYER_COUNT = 15;
const PROPERTY_COUNT = 30;
const IMAGES_PER_PROPERTY = 5;
const CONNECTION_COUNT = 12;

const LOCALITIES = [
    { locality: 'Beverly Hills', region: 'CA', postalCode: '90210' },
    { locality: 'Malibu', region: 'CA', postalCode: '90265' },
    { locality: 'Marin Ridge', region: 'CA', postalCode: '94904' },
    { locality: 'Aspen', region: 'CO', postalCode: '81611' },
    { locality: 'Palm Beach', region: 'FL', postalCode: '33480' },
    { locality: 'Greenwich', region: 'CT', postalCode: '06830' },
];

const AMENITIES = [
    'Infinity pool',
    'Wine cellar',
    'Home cinema',
    'Guest house',
    'Tennis court',
    'Private gym',
    'Elevator',
    'Smart home system',
];

const FEATURES = [
    'Floor-to-ceiling glazing',
    'Chef kitchen',
    'Primary suite with terrace',
    'Heated stone floors',
    'Four-car garage',
    'Landscaped courtyard',
    'Ocean views',
    'Vaulted ceilings',
];

const LISTABLE_TYPES = [
    PropertyType.ESTATE,
    PropertyType.VILLA,
    PropertyType.PENTHOUSE,
    PropertyType.HOUSE,
    PropertyType.TOWNHOUSE,
    PropertyType.CONDO,
];

const LISTABLE_STATUSES = [
    PropertyStatus.AVAILABLE,
    PropertyStatus.AVAILABLE,
    PropertyStatus.AVAILABLE,
    PropertyStatus.PENDING,
    PropertyStatus.SOLD,
];

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
        email: faker.internet.email().toLowerCase(),
        passwordHash: bcrypt.hashSync('password123', 10),
        avatar: faker.image.avatar(),
        bio: faker.lorem.sentence(),
        phoneNumber: faker.phone.number(),
        role: UserRole.BUYER,
        status: UserAccountStatus.ACTIVE,
        lastActive: faker.date.recent(),
        month: faker.helpers.enumValue(Month),
        day: faker.helpers.enumValue(Day),
        year: faker.number.int({ min: 2020, max: 2025 }),
        ...overrides,
    } satisfies Prisma.UserCreateInput;
}

function buildSellerProfile() {
    return {
        role: UserRole.SELLER,
        jobTitle: faker.helpers.arrayElement([
            'Senior Advisor',
            'Principal Broker',
            'Estate Director',
        ]),
        agencyName: `${faker.person.lastName()} & Associates`,
        licenseNumber: faker.string.alphanumeric({
            length: 8,
            casing: 'upper',
        }),
    };
}

function buildProperty(sellerId: string): Prisma.PropertyCreateInput {
    const place = faker.helpers.arrayElement(LOCALITIES);
    const sqFt = faker.number.int({ min: 1800, max: 9500 });

    return {
        title: `${faker.word.adjective()} ${faker.helpers.arrayElement(['Residence', 'Estate', 'House', 'Retreat'])} on ${faker.location.street()}`,
        description: faker.lorem.paragraphs(2),
        address: faker.location.streetAddress(),
        locality: place.locality,
        region: place.region,
        postalCode: place.postalCode,
        country: 'US',
        latitude: faker.location.latitude(),
        longitude: faker.location.longitude(),
        price: faker.number.int({ min: 850_000, max: 24_000_000 }),
        bedrooms: faker.number.int({ min: 2, max: 8 }),
        bathrooms: faker.number.int({ min: 2, max: 9 }),
        sqFt,
        lotSqFt: sqFt * faker.number.int({ min: 2, max: 6 }),
        yearBuilt: faker.number.int({ min: 1955, max: 2025 }),
        walkScore: faker.number.int({ min: 20, max: 98 }),
        viewsCount: faker.number.int({ min: 0, max: 4200 }),
        amenities: faker.helpers.arrayElements(AMENITIES, { min: 3, max: 6 }),
        features: faker.helpers.arrayElements(FEATURES, { min: 4, max: 7 }),
        type: faker.helpers.arrayElement(LISTABLE_TYPES),
        status: faker.helpers.arrayElement(LISTABLE_STATUSES),
        seller: { connect: { id: sellerId } },
        images: {
            create: Array.from({ length: IMAGES_PER_PROPERTY }, (_, order) => ({
                url: `https://picsum.photos/seed/${faker.string.alphanumeric(10)}/1200/800`,
                order,
            })),
        },
    };
}

async function main() {
    try {
        console.log('Seeding database...');

        await prisma.user.create({
            data: buildUser({
                fullName: 'Admin User',
                email: 'admin@example.com',
                role: UserRole.ADMIN,
            }),
        });

        const sellers = await Promise.all(
            Array.from({ length: SELLER_COUNT }, (_, index) =>
                prisma.user.create({
                    data: buildUser({
                        ...buildSellerProfile(),
                        email:
                            index === 0
                                ? 'seller@example.com'
                                : faker.internet.email().toLowerCase(),
                    }),
                }),
            ),
        );

        const buyers = await Promise.all(
            Array.from({ length: BUYER_COUNT }, (_, index) =>
                prisma.user.create({
                    data: buildUser({
                        email:
                            index === 0
                                ? 'buyer@example.com'
                                : faker.internet.email().toLowerCase(),
                    }),
                }),
            ),
        );

        const properties = await Promise.all(
            Array.from({ length: PROPERTY_COUNT }, () =>
                prisma.property.create({
                    data: buildProperty(faker.helpers.arrayElement(sellers).id),
                }),
            ),
        );

        const savedPairs = faker.helpers
            .multiple(
                () => ({
                    buyerId: faker.helpers.arrayElement(buyers).id,
                    propertyId: faker.helpers.arrayElement(properties).id,
                }),
                { count: 40 },
            )
            .filter(
                (pair, index, all) =>
                    all.findIndex(
                        (other) =>
                            other.buyerId === pair.buyerId &&
                            other.propertyId === pair.propertyId,
                    ) === index,
            );

        await prisma.savedProperty.createMany({ data: savedPairs });

        const connectionPairs = faker.helpers
            .multiple(
                () => {
                    const property = faker.helpers.arrayElement(properties);
                    return {
                        buyerId: faker.helpers.arrayElement(buyers).id,
                        sellerId: property.sellerId,
                        propertyId: property.id,
                        status: faker.helpers.enumValue(ConnectionStatus),
                    };
                },
                { count: CONNECTION_COUNT },
            )
            .filter(
                (pair, index, all) =>
                    all.findIndex(
                        (other) =>
                            other.buyerId === pair.buyerId &&
                            other.propertyId === pair.propertyId,
                    ) === index,
            );

        await prisma.connection.createMany({ data: connectionPairs });

        console.log(
            `\n✅ Seeded ${sellers.length} sellers, ${buyers.length} buyers, ${properties.length} properties.`,
        );
        console.log(
            'Sign in with admin@example.com / seller@example.com / buyer@example.com — password123',
        );
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
