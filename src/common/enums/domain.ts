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
export const ZERO_DECIMAL_CURRENCIES = [
    'bif',
    'clp',
    'djf',
    'gnf',
    'jpy',
    'kmf',
    'krw',
    'mga',
    'pyg',
    'rwf',
    'ugx',
    'vnd',
    'vuv',
    'xaf',
    'xof',
    'xpf',
];
export const DEFAULT_FRONTEND_URL = 'http://localhost:3000';
export const DEFAULT_PORT = 5000;
export const GLOBAL_PREFIX = 'api';
export const SWAGGER_PATH = `${GLOBAL_PREFIX}/docs`;
export const DEFAULT_JWT_EXPIRATION = '24h';
export const SMTP_SECURE_PORT = 465;
export const DEFAULT_SENTRY_TRACES_SAMPLE_RATE = 0.1;
export const E164_PATTERN = /^\+[1-9]\d{7,14}$/;
export const E164_MESSAGE =
    'phoneNumber must be in E.164 format, for example +14155552671';

export enum NodeEnv {
    DEVELOPMENT = 'development',
    TEST = 'test',
    PRODUCTION = 'production',
}
export const MAX_OFFER_EXPIRY_DAYS = 90;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const MIN_PASSWORD_LENGTH = 8;
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;
export const LOGIN_MAX_ATTEMPTS = 8;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const SETTING_OPEN_SIGNUPS = 'openSignups';

export const EMAIL_CODE_LENGTH = 6;
export const EMAIL_CODE_TTL_MS = 15 * 60 * 1000;
export const EMAIL_CODE_MAX_ATTEMPTS = 5;
export const SETTING_MAINTENANCE = 'maintenanceMode';
export const SETTING_BASE_CURRENCY = 'baseCurrency';

export const TOKEN_KEY_BYTES = 32;
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export enum DisputeOutcome {
    RELEASE = 'RELEASE',
    REFUND = 'REFUND',
}
