import { Prisma } from 'generated/prisma/client';
import { TimeFilter } from '@common/enums/filter';
import { UserRepo } from '@common/repos/user.repo';
import { PrismaService } from '@common/database/prisma.service';
import { SuspensionsService } from '@modules/suspensions/suspensions.service';
import { StatsService } from './stats.service';

const sale = (iso: string, price: number) => ({
    completedAt: new Date(iso),
    finalPrice: new Prisma.Decimal(price),
});

const created = (iso: string) => ({ createdAt: new Date(iso) });

describe('StatsService.fetchTrend', () => {
    const prisma = {
        transaction: {
            findMany: jest
                .fn()
                .mockResolvedValue([
                    sale('2026-10-03T10:00:00.000Z', 1_000),
                    sale('2026-10-03T18:00:00.000Z', 500),
                    sale('2026-10-05T09:00:00.000Z', 2_000),
                ]),
        },
        user: {
            findMany: jest
                .fn()
                .mockResolvedValue([created('2026-10-04T09:00:00.000Z')]),
        },
        property: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const service = new StatsService(
        {} as UserRepo,
        prisma as unknown as PrismaService,
        {} as SuspensionsService,
    );

    it('groups the seven-day window by day', async () => {
        const trend = await service.fetchTrend(TimeFilter.DAY);

        expect(trend.gmv).toEqual([
            { name: '2026-10-03', value: 1_500 },
            { name: '2026-10-05', value: 2_000 },
        ]);
        expect(trend.deals).toEqual([
            { name: '2026-10-03', value: 2 },
            { name: '2026-10-05', value: 1 },
        ]);
        expect(trend.users).toEqual([{ name: '2026-10-04', value: 1 }]);
    });

    it('keeps grouping the longer windows by month', async () => {
        const trend = await service.fetchTrend(TimeFilter.MONTH);

        expect(trend.gmv).toEqual([{ name: '2026-10', value: 3_500 }]);
        expect(trend.deals).toEqual([{ name: '2026-10', value: 3 }]);
    });
});
