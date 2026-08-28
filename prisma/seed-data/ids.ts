import { Day, Month } from '../../generated/prisma/client';

export const SEED_PREFIX = 'seed-';

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

const MONTHS: readonly Month[] = [
    Month.JAN,
    Month.FEB,
    Month.MAR,
    Month.APR,
    Month.MAY,
    Month.JUN,
    Month.JUL,
    Month.AUG,
    Month.SEP,
    Month.OCT,
    Month.NOV,
    Month.DEC,
];

const DAYS: readonly Day[] = [
    Day.SUN,
    Day.MON,
    Day.TUE,
    Day.WED,
    Day.THU,
    Day.FRI,
    Day.SAT,
];

export const periodOf = (
    date: Date,
): { year: number; month: Month; day: Day } => ({
    year: date.getFullYear(),
    month: MONTHS[date.getMonth()],
    day: DAYS[date.getDay()],
});
