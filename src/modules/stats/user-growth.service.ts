import { Injectable } from '@nestjs/common';
import { UserRepo } from '@common/repos/user.repo';
import { SERIES_LENGTH } from '@common/enums/filter';
import { countByKey, periodRange, periodSeries } from 'src/lib/period';
import {
    SeriesQueryDto,
    TotalQueryDto,
    PeriodSeriesResponseDto,
    PeriodTotalResponseDto,
} from './dto';

@Injectable()
export class UserGrowthService {
    constructor(private readonly userRepo: UserRepo) {}

    async usersTotal({
        period,
        date,
    }: TotalQueryDto): Promise<PeriodTotalResponseDto> {
        const { start, end } = periodRange(
            period,
            date ? new Date(date) : new Date(),
        );
        const total = await this.userRepo.count({
            where: { createdAt: { gte: start, lt: end } },
        });

        return {
            period,
            start: start.toISOString(),
            end: end.toISOString(),
            total,
        };
    }

    async usersSeries({
        period,
    }: SeriesQueryDto): Promise<PeriodSeriesResponseDto> {
        const { start, end, keys } = periodSeries(
            period,
            SERIES_LENGTH[period],
            new Date(),
        );
        const rows = await this.userRepo.findMany({
            where: { createdAt: { gte: start, lt: end } },
            select: { createdAt: true },
        });
        const counts = countByKey(
            period,
            keys,
            rows.map((row) => row.createdAt),
        );

        return {
            period,
            start: start.toISOString(),
            end: end.toISOString(),
            points: [...counts].map(([key, value]) => ({ key, value })),
        };
    }
}
