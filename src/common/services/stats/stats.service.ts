import { Injectable } from '@nestjs/common';
import { TimeFilter } from '@common/enums/filter';
import { UserRepo } from '@common/repos/user.repo';
import { UserAccountStatus } from '../../../../generated/prisma';

@Injectable()
export class StatsService {
    constructor(private userRepo: UserRepo) {}

    private getStartDate(filter: TimeFilter, month: boolean = true) {
        const now = new Date();

        return filter === TimeFilter.DAY
            ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
            : filter === TimeFilter.MONTH && month
              ? new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
              : filter === TimeFilter.YEAR
                ? new Date(now.getFullYear() - 5, now.getMonth(), now.getDate())
                : new Date(
                      now.getFullYear(),
                      now.getMonth() - 1,
                      now.getDate(),
                  );
    }

    async fetchDashboardStats(filter: TimeFilter, month: boolean = true) {
        const startDate = this.getStartDate(filter, month);
        const actualFilter: TimeFilter = month
            ? TimeFilter.MONTH
            : TimeFilter.DAY;

        const [userCount, userStats] = await Promise.all([
            this.userRepo.count(),
            this.userRepo.groupBy({
                by: [actualFilter],
                where: {
                    createdAt: {
                        gte: startDate,
                    },
                },
                _count: {
                    _all: true,
                },
            } as any),
        ]);

        const userData = userStats.map((stat: any) => ({
            name: actualFilter === TimeFilter.DAY ? stat.day : stat.month,
            value: stat._count._all,
        }));

        const dataKey =
            actualFilter === TimeFilter.DAY ? 'dailyData' : 'monthlyData';

        return {
            user: {
                change: 0,
                trend: 'up',
                [dataKey]: userData,
                currentFigure: userCount,
            },
        };
    }

    async fetchUserStats() {
        const [total, active, pending, suspended] = await Promise.all([
            this.userRepo.count(),
            this.userRepo.count({
                where: { status: UserAccountStatus.ACTIVE },
            }),
            this.userRepo.count({
                where: { status: UserAccountStatus.PENDING },
            }),
            this.userRepo.count({
                where: { status: UserAccountStatus.SUSPENDED },
            }),
        ]);
        return { total, active, pending, suspended };
    }
}
