import { TimeFilter, type TimeFilterValue } from '@common/enums/filter';

export interface PeriodRange {
    start: Date;
    end: Date;
}

export interface PeriodSeries extends PeriodRange {
    keys: string[];
}

const KEY_LENGTH: Record<TimeFilterValue, number> = {
    [TimeFilter.DAY]: 10,
    [TimeFilter.MONTH]: 7,
    [TimeFilter.YEAR]: 4,
};

const startOf = (period: TimeFilterValue, date: Date): Date =>
    new Date(
        Date.UTC(
            date.getUTCFullYear(),
            period === TimeFilter.YEAR ? 0 : date.getUTCMonth(),
            period === TimeFilter.DAY ? date.getUTCDate() : 1,
        ),
    );

const shift = (period: TimeFilterValue, start: Date, steps: number): Date =>
    new Date(
        Date.UTC(
            start.getUTCFullYear() + (period === TimeFilter.YEAR ? steps : 0),
            start.getUTCMonth() + (period === TimeFilter.MONTH ? steps : 0),
            start.getUTCDate() + (period === TimeFilter.DAY ? steps : 0),
        ),
    );

export const periodKey = (period: TimeFilterValue, date: Date): string =>
    date.toISOString().slice(0, KEY_LENGTH[period]);

export const periodRange = (
    period: TimeFilterValue,
    date: Date,
): PeriodRange => {
    const start = startOf(period, date);
    return { start, end: shift(period, start, 1) };
};

export const periodSeries = (
    period: TimeFilterValue,
    length: number,
    now: Date,
): PeriodSeries => {
    const current = startOf(period, now);
    const starts = Array.from({ length }, (_, index) =>
        shift(period, current, index - length + 1),
    );
    return {
        start: starts[0],
        end: shift(period, current, 1),
        keys: starts.map((start) => periodKey(period, start)),
    };
};

export const countByKey = (
    period: TimeFilterValue,
    keys: string[],
    dates: Date[],
): Map<string, number> => {
    const counts = new Map(keys.map((key) => [key, 0]));
    for (const date of dates) {
        const key = periodKey(period, date);
        const count = counts.get(key);
        if (count !== undefined) counts.set(key, count + 1);
    }
    return counts;
};
