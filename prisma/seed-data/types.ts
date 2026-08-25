import type {
    PropertyStatus,
    PropertyType,
} from '../../generated/prisma/client';

export interface AgentSeed {
    key: string;
    fullName: string;
    email: string;
    jobTitle: string;
    agencyName: string;
    licenseNumber: string;
    phoneNumber: string;
    avatar: string;
    rating: number;
    reviews: number;
    responseMinutes: number;
}

export interface PropertySeed {
    key: string;
    title: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    sqFt: number;
    lotSqFt: number;
    yearBuilt: number;
    type: PropertyType;
    status: PropertyStatus;
    address: string;
    locality: string;
    region: string;
    postalCode: string;
    listedDaysAgo: number;
    saves: number;
    walkScore: number;
    agentKey: string;
    blurb: string;
    imageSeed: number;
    featureOffset: number;
    soldMonthsAgo?: number;
}
