import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { SERIES_LENGTH, TimeFilter } from '@common/enums/filter';
import type { TimeFilterValue } from '@common/enums/filter';
import { countByKey, periodSeries } from 'src/lib/period';
import { sumDecimal, toNumber } from '@common/money';
import { UserRepo } from '@common/repos/user.repo';
import { PrismaService } from '@common/database/prisma.service';
import { SuspensionsService } from '@modules/suspensions/suspensions.service';
import {
    OfferStatus,
    PropertyStatus,
    TransactionStatus,
    UserAccountStatus,
    ViewingStatus,
} from '@generated/prisma/enums';

interface Settled {
    createdAt: Date;
    completedAt: Date | null;
    finalPrice: Prisma.Decimal;
    property: { price: Prisma.Decimal };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MONTH_KEY_LENGTH = 7;
const DAY_KEY_LENGTH = 10;
const MONTHS_PER_YEAR = 12;

const bucketBy = <T>(
    rows: T[],
    dateOf: (row: T) => Date | null,
    valueOf: (row: T) => number,
    keyLength = MONTH_KEY_LENGTH,
) => {
    const buckets = new Map<string, number>();

    for (const row of rows) {
        const date = dateOf(row);
        if (!date) continue;
        const key = date.toISOString().slice(0, keyLength);
        buckets.set(key, (buckets.get(key) ?? 0) + valueOf(row));
    }

    return [...buckets.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, value]) => ({ name, value }));
};

const averageDaysToClose = (sales: Settled[]) => {
    const closed = sales.filter((sale) => sale.completedAt);
    if (!closed.length) return 0;

    const total = closed.reduce((sum, sale) => {
        const completedAt = sale.completedAt;
        if (!completedAt) return sum;
        return (
            sum +
            (completedAt.getTime() - sale.createdAt.getTime()) / MS_PER_DAY
        );
    }, 0);

    return Math.round(total / closed.length);
};

const averageRating = (reviews: { rating: number }[]) => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return Number((total / reviews.length).toFixed(1));
};

const averageSaleToList = (sales: Settled[]) => {
    const priced = sales.filter((sale) => sale.property.price.gt(0));
    if (!priced.length) return 0;

    const total = priced.reduce(
        (sum, sale) =>
            sum + sale.finalPrice.div(sale.property.price).toNumber(),
        0,
    );

    return Number(((total / priced.length) * 100).toFixed(1));
};

@Injectable()
export class StatsService {
    constructor(
        private userRepo: UserRepo,
        private prisma: PrismaService,
        private suspensionsService: SuspensionsService,
    ) {}

    private getStartDate(filter: TimeFilterValue) {
        const now = new Date();

        return filter === TimeFilter.DAY
            ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
            : filter === TimeFilter.MONTH
              ? new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
              : filter === TimeFilter.YEAR
                ? new Date(now.getFullYear() - 5, now.getMonth(), now.getDate())
                : new Date(
                      now.getFullYear(),
                      now.getMonth() - 1,
                      now.getDate(),
                  );
    }

    async fetchDashboardStats(filter: TimeFilterValue) {
        const period =
            filter === TimeFilter.DAY ? TimeFilter.DAY : TimeFilter.MONTH;
        const length =
            filter === TimeFilter.YEAR
                ? SERIES_LENGTH[TimeFilter.YEAR] * MONTHS_PER_YEAR
                : SERIES_LENGTH[period];
        const { start, end, keys } = periodSeries(period, length, new Date());

        const [userCount, rows] = await Promise.all([
            this.userRepo.count(),
            this.userRepo.findMany({
                where: { createdAt: { gte: start, lt: end } },
                select: { createdAt: true },
            }),
        ]);

        const userData = [
            ...countByKey(
                period,
                keys,
                rows.map((row) => row.createdAt),
            ),
        ].map(([name, value]) => ({ name, value }));

        const dataKey = period === TimeFilter.DAY ? 'dailyData' : 'monthlyData';

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
        await this.suspensionsService.liftExpired();
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
            averagePrice: toNumber(engagement._avg.price),
            saves: savesCount,
            pendingViewings,
            pendingOffers,
            acceptedOffers,
            closedValue: toNumber(closedValue._sum.finalPrice),
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
            volume: toNumber(volume._sum.finalPrice),
        };
    }

    async fetchRegionMetrics() {
        const [grouped, sold] = await Promise.all([
            this.prisma.property.groupBy({
                by: ['region'],
                _count: { _all: true },
                _avg: { price: true },
            }),
            this.prisma.transaction.findMany({
                where: { status: TransactionStatus.COMPLETED },
                select: {
                    finalPrice: true,
                    property: { select: { region: true } },
                },
            }),
        ]);

        const volumeByRegion = new Map<string, Prisma.Decimal>();
        for (const sale of sold) {
            const region = sale.property.region;
            volumeByRegion.set(
                region,
                (volumeByRegion.get(region) ?? new Prisma.Decimal(0)).add(
                    sale.finalPrice,
                ),
            );
        }

        return grouped
            .map((row) => ({
                region: row.region,
                listings: typeof row._count === 'object' ? row._count._all : 0,
                avgPrice: toNumber(row._avg?.price),
                volume: toNumber(volumeByRegion.get(row.region)),
            }))
            .sort((a, b) => b.volume - a.volume);
    }

    async fetchTrend(filter: TimeFilterValue) {
        const startDate = this.getStartDate(filter);
        const keyLength =
            filter === TimeFilter.DAY ? DAY_KEY_LENGTH : MONTH_KEY_LENGTH;

        const [sales, signups, listings] = await Promise.all([
            this.prisma.transaction.findMany({
                where: {
                    status: TransactionStatus.COMPLETED,
                    completedAt: { gte: startDate },
                },
                select: { completedAt: true, finalPrice: true },
            }),
            this.prisma.user.findMany({
                where: { createdAt: { gte: startDate } },
                select: { createdAt: true },
            }),
            this.prisma.property.findMany({
                where: { createdAt: { gte: startDate } },
                select: { createdAt: true },
            }),
        ]);

        return {
            gmv: bucketBy(
                sales,
                (sale) => sale.completedAt,
                (sale) => toNumber(sale.finalPrice),
                keyLength,
            ),
            deals: bucketBy(
                sales,
                (sale) => sale.completedAt,
                () => 1,
                keyLength,
            ),
            users: bucketBy(
                signups,
                (row) => row.createdAt,
                () => 1,
                keyLength,
            ),
            listings: bucketBy(
                listings,
                (row) => row.createdAt,
                () => 1,
                keyLength,
            ),
        };
    }

    async fetchAgentAnalytics(sellerId: string) {
        const startDate = this.getStartDate(TimeFilter.MONTH);

        const [sales, listings, platformSales, ratings, platformRatings] =
            await Promise.all([
                this.prisma.transaction.findMany({
                    where: {
                        sellerId,
                        status: TransactionStatus.COMPLETED,
                        completedAt: { gte: startDate },
                    },
                    select: {
                        completedAt: true,
                        createdAt: true,
                        finalPrice: true,
                        property: { select: { price: true, createdAt: true } },
                    },
                }),
                this.prisma.property.count({ where: { sellerId } }),
                this.prisma.transaction.findMany({
                    where: { status: TransactionStatus.COMPLETED },
                    select: {
                        createdAt: true,
                        completedAt: true,
                        finalPrice: true,
                        property: { select: { price: true } },
                    },
                }),
                this.prisma.review.findMany({
                    where: { revieweeId: sellerId },
                    select: { rating: true },
                }),
                this.prisma.review.findMany({ select: { rating: true } }),
            ]);

        const volume = toNumber(
            sumDecimal(sales.map((sale) => sale.finalPrice)),
        );
        const platformVolume = toNumber(
            sumDecimal(platformSales.map((sale) => sale.finalPrice)),
        );

        return {
            production: {
                deals: sales.length,
                volume,
                averagePrice: sales.length ? volume / sales.length : 0,
                listings,
            },
            monthly: bucketBy(
                sales,
                (sale) => sale.completedAt,
                (sale) => toNumber(sale.finalPrice),
            ),
            monthlyDeals: bucketBy(
                sales,
                (sale) => sale.completedAt,
                () => 1,
            ),
            benchmarks: {
                daysToClose: averageDaysToClose(sales),
                platformDaysToClose: averageDaysToClose(platformSales),
                saleToList: averageSaleToList(sales),
                platformSaleToList: averageSaleToList(platformSales),
                averagePrice: sales.length ? volume / sales.length : 0,
                platformAveragePrice: platformSales.length
                    ? platformVolume / platformSales.length
                    : 0,
                rating: averageRating(ratings),
                platformRating: averageRating(platformRatings),
            },
        };
    }
}
