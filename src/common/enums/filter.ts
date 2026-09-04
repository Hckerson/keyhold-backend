export const TimeFilter = {
    DAY: 'day',
    MONTH: 'month',
    YEAR: 'year',
} as const;

export type TimeFilterValue = (typeof TimeFilter)[keyof typeof TimeFilter];
