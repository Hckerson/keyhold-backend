export const SEED_PREFIX = 'seed-';

export const SEED_MAIL_DOMAIN = 'example.com';

export const PLATFORM_MAIL_DOMAIN = 'keyhol.me';

export const SEED_FILES_ORIGIN = `https://files.${PLATFORM_MAIL_DOMAIN}`;

export const seedId = (domain: string, ...parts: (string | number)[]): string =>
    `${SEED_PREFIX}${domain}-${parts.join('-')}`;

export const MS_PER_DAY = 86_400_000;

export const MS_PER_MINUTE = 60_000;

export const DAYS_PER_MONTH = 30;

export const daysAgo = (now: Date, days: number): Date =>
    new Date(now.getTime() - days * MS_PER_DAY);

export const daysAhead = (now: Date, days: number): Date =>
    new Date(now.getTime() + days * MS_PER_DAY);

export const minutesAgo = (now: Date, minutes: number): Date =>
    new Date(now.getTime() - minutes * MS_PER_MINUTE);
