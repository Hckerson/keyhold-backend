export const TimeFilter = {
    DAY: 'day',
    MONTH: 'month',
    YEAR: 'year',
} as const;

export type TimeFilterValue = (typeof TimeFilter)[keyof typeof TimeFilter];

export const SERIES_LENGTH: Record<TimeFilterValue, number> = {
    [TimeFilter.DAY]: 7,
    [TimeFilter.MONTH]: 12,
    [TimeFilter.YEAR]: 5,
};
