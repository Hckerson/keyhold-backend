import { Test } from '@nestjs/testing';
import { TimeFilter } from '@common/enums/filter';
import { UserRepo } from '@common/repos/user.repo';
import { UserGrowthService } from './user-growth.service';

const NOW = new Date('2026-09-22T08:17:00.000Z');

const serviceWith = async (createdAt: Date[]) => {
    const count = jest.fn().mockResolvedValue(createdAt.length);
    const findMany = jest
        .fn()
        .mockResolvedValue(createdAt.map((date) => ({ createdAt: date })));

    const moduleRef = await Test.createTestingModule({
        providers: [
            UserGrowthService,
            { provide: UserRepo, useValue: { count, findMany } },
        ],
    }).compile();

    return { service: moduleRef.get(UserGrowthService), count };
};

describe('UserGrowthService', () => {
    beforeAll(() => {
        jest.useFakeTimers({ now: NOW.getTime() });
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    it('counts one calendar month, end-exclusive', async () => {
        const { service, count } = await serviceWith([]);
        const result = await service.usersTotal({ period: TimeFilter.MONTH });

        expect(count).toHaveBeenCalledWith({
            where: {
                createdAt: {
                    gte: new Date('2026-09-01T00:00:00.000Z'),
                    lt: new Date('2026-10-01T00:00:00.000Z'),
                },
            },
        });
        expect(result.start).toBe('2026-09-01T00:00:00.000Z');
        expect(result.end).toBe('2026-10-01T00:00:00.000Z');
    });

    it('counts the period that contains a supplied date', async () => {
        const { service } = await serviceWith([]);
        const result = await service.usersTotal({
            period: TimeFilter.YEAR,
            date: '2024-03-15',
        });

        expect(result.start).toBe('2024-01-01T00:00:00.000Z');
        expect(result.end).toBe('2025-01-01T00:00:00.000Z');
    });

    it('returns one point per day, zero-filled, oldest first', async () => {
        const { service } = await serviceWith([
            new Date('2026-09-22T01:00:00.000Z'),
            new Date('2026-09-22T05:00:00.000Z'),
            new Date('2026-09-18T12:00:00.000Z'),
        ]);
        const { points } = await service.usersSeries({
            period: TimeFilter.DAY,
        });

        expect(points).toHaveLength(7);
        expect(points[0]).toEqual({ key: '2026-09-16', value: 0 });
        expect(points[2]).toEqual({ key: '2026-09-18', value: 1 });
        expect(points[6]).toEqual({ key: '2026-09-22', value: 2 });
    });
});
