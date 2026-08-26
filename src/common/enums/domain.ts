import {
    OfferStatus,
    PropertyStatus,
    TransactionStatus,
    UserRole,
} from '@generated/prisma/enums';

export const PUBLIC_REGISTER_ROLES: UserRole[] = [
    UserRole.BUYER,
    UserRole.SELLER,
];

export const OFFER_RESPONSE_STATUSES: OfferStatus[] = [
    OfferStatus.ACCEPTED,
    OfferStatus.REJECTED,
    OfferStatus.COUNTERED,
];

export const LIVE_OFFER_STATUSES: OfferStatus[] = [
    OfferStatus.PENDING,
    OfferStatus.COUNTERED,
];

export const OPEN_LISTING_STATUSES: PropertyStatus[] = [
    PropertyStatus.AVAILABLE,
];

export const PUBLIC_PROPERTY_STATUSES: PropertyStatus[] = [
    PropertyStatus.AVAILABLE,
    PropertyStatus.PENDING,
    PropertyStatus.SOLD,
];

export const LIVE_TRANSACTION_STATUSES: TransactionStatus[] = [
    TransactionStatus.PENDING,
    TransactionStatus.IN_PROGRESS,
];

export const DEFAULT_CURRENCY = 'usd';
export const CENTS_PER_UNIT = 100;
export const MAX_OFFER_EXPIRY_DAYS = 90;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const MIN_PASSWORD_LENGTH = 8;
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;
export const LOGIN_MAX_ATTEMPTS = 8;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const SETTING_OPEN_SIGNUPS = 'openSignups';
export const SETTING_MAINTENANCE = 'maintenanceMode';
export const SETTING_BASE_CURRENCY = 'baseCurrency';

export enum DisputeOutcome {
    RELEASE = 'RELEASE',
    REFUND = 'REFUND',
}
