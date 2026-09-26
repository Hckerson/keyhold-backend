import { TimeFilter } from '@common/enums/filter';
import { countByKey, periodKey, periodRange, periodSeries } from './period';

const NOW = new Date('2026-09-22T08:17:00.000Z');

const iso = ({ start, end }: { start: Date; end: Date }) => ({
    start: start.toISOString(),
    end: end.toISOString(),
});

describe('periodRange', () => {
    it('spans one day, ending where the next begins', () => {
        expect(iso(periodRange(TimeFilter.DAY, NOW))).toEqual({
            start: '2026-09-22T00:00:00.000Z',
            end: '2026-09-23T00:00:00.000Z',
        });
    });

    it('spans the whole calendar month', () => {
        expect(iso(periodRange(TimeFilter.MONTH, NOW))).toEqual({
            start: '2026-09-01T00:00:00.000Z',
            end: '2026-10-01T00:00:00.000Z',
        });
    });

    it('spans the whole calendar year', () => {
        expect(iso(periodRange(TimeFilter.YEAR, NOW))).toEqual({
            start: '2026-01-01T00:00:00.000Z',
            end: '2027-01-01T00:00:00.000Z',
        });
    });

    it('rolls over a month and a year boundary', () => {
        const lastDay = new Date('2026-12-31T23:59:59.999Z');
        expect(iso(periodRange(TimeFilter.DAY, lastDay)).end).toBe(
            '2027-01-01T00:00:00.000Z',
        );
        expect(iso(periodRange(TimeFilter.MONTH, lastDay)).end).toBe(
            '2027-01-01T00:00:00.000Z',
        );
    });
});

describe('periodSeries', () => {
    it('ends on the current day and starts six days earlier', () => {
        const series = periodSeries(TimeFilter.DAY, 7, NOW);
        expect(iso(series)).toEqual({
            start: '2026-09-16T00:00:00.000Z',
            end: '2026-09-23T00:00:00.000Z',
        });
        expect(series.keys).toEqual([
            '2026-09-16',
            '2026-09-17',
            '2026-09-18',
            '2026-09-19',
            '2026-09-20',
            '2026-09-21',
            '2026-09-22',
        ]);
    });

    it('starts twelve months back on a month boundary, never mid-month', () => {
        const series = periodSeries(TimeFilter.MONTH, 12, NOW);
        expect(series.start.toISOString()).toBe('2025-10-01T00:00:00.000Z');
        expect(series.keys[0]).toBe('2025-10');
        expect(series.keys.at(-1)).toBe('2026-09');
        expect(new Set(series.keys).size).toBe(12);
    });

    it('covers five calendar years ending with the current one', () => {
        expect(periodSeries(TimeFilter.YEAR, 5, NOW).keys).toEqual([
            '2022',
            '2023',
            '2024',
            '2025',
            '2026',
        ]);
    });
});

describe('countByKey', () => {
    it('keeps empty buckets at zero and never merges two years', () => {
        const { keys } = periodSeries(TimeFilter.MONTH, 12, NOW);
        const counts = countByKey(TimeFilter.MONTH, keys, [
            new Date('2026-09-02T10:00:00.000Z'),
            new Date('2026-09-20T10:00:00.000Z'),
            new Date('2025-10-05T10:00:00.000Z'),
            new Date('2025-09-25T10:00:00.000Z'),
        ]);
        expect(counts.get('2026-09')).toBe(2);
        expect(counts.get('2025-10')).toBe(1);
        expect(counts.get('2026-01')).toBe(0);
        expect(counts.has('2025-09')).toBe(false);
        expect(counts.size).toBe(12);
    });

    it('keys a date by its UTC calendar position', () => {
        expect(periodKey(TimeFilter.DAY, NOW)).toBe('2026-09-22');
        expect(periodKey(TimeFilter.MONTH, NOW)).toBe('2026-09');
        expect(periodKey(TimeFilter.YEAR, NOW)).toBe('2026');
    });
});
