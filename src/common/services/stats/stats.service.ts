import { Injectable } from '@nestjs/common';
import { TimeFilter } from '@common/enums/filter';
import { UserRepo } from '@common/repos/user.repo';
import { PrismaService } from '@common/database/prisma.service';
import {
    OfferStatus,
    PropertyStatus,
    TransactionStatus,
    UserAccountStatus,
    ViewingStatus,
} from '@generated/prisma/enums';

@Injectable()
export class StatsService {
    constructor(
        private userRepo: UserRepo,
        private prisma: PrismaService,
    ) {}

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
            }),
        ]);

        const userData = userStats.map((stat) => ({
            name: actualFilter === TimeFilter.DAY ? stat.day : stat.month,
            value: stat?._count || 0,
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

    async fetchSellerStats(sellerId: string) {
        const [
            listings,
            activeListings,
            soldListings,
            engagement,
            savesCount,
            pendingViewings,
            pendingOffers,
            acceptedOffers,
            closedValue,
        ] = await Promise.all([
            this.prisma.property.count({ where: { sellerId } }),
            this.prisma.property.count({
                where: { sellerId, status: PropertyStatus.AVAILABLE },
            }),
            this.prisma.property.count({
                where: { sellerId, status: PropertyStatus.SOLD },
            }),
            this.prisma.property.aggregate({
                where: { sellerId },
                _sum: { viewsCount: true },
                _avg: { price: true },
            }),
            this.prisma.savedProperty.count({
                where: { property: { sellerId } },
            }),
            this.prisma.viewing.count({
                where: {
                    property: { sellerId },
                    status: ViewingStatus.PENDING,
                },
            }),
            this.prisma.offer.count({
                where: { property: { sellerId }, status: OfferStatus.PENDING },
            }),
            this.prisma.offer.count({
                where: { property: { sellerId }, status: OfferStatus.ACCEPTED },
            }),
            this.prisma.transaction.aggregate({
                where: { sellerId, status: TransactionStatus.COMPLETED },
                _sum: { finalPrice: true },
            }),
        ]);

        return {
            listings,
            activeListings,
            soldListings,
            views: engagement._sum.viewsCount ?? 0,
            averagePrice: engagement._avg.price ?? 0,
            saves: savesCount,
            pendingViewings,
            pendingOffers,
            acceptedOffers,
            closedValue: closedValue._sum.finalPrice ?? 0,
        };
    }

    async fetchPlatformStats() {
        const [
            users,
            properties,
            activeProperties,
            connections,
            transactions,
            completedTransactions,
            volume,
        ] = await Promise.all([
            this.userRepo.count(),
            this.prisma.property.count(),
            this.prisma.property.count({
                where: { status: PropertyStatus.AVAILABLE },
            }),
            this.prisma.connection.count(),
            this.prisma.transaction.count(),
            this.prisma.transaction.count({
                where: { status: TransactionStatus.COMPLETED },
            }),
            this.prisma.transaction.aggregate({
                where: { status: TransactionStatus.COMPLETED },
                _sum: { finalPrice: true },
            }),
        ]);

        return {
            users,
            properties,
            activeProperties,
            connections,
            transactions,
            completedTransactions,
            volume: volume._sum.finalPrice ?? 0,
        };
    }
}
