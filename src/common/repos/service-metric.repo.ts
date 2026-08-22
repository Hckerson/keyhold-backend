import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { RepoError } from '@common/errors/repo.error';
import { PrismaService } from '@common/database/prisma.service';

@Injectable()
export class ServiceMetricRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.ServiceMetricFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.ServiceMetricGetPayload<T> | null> {
        try {
            return (await this.prisma.serviceMetric.findUnique(
                params,
            )) as Prisma.ServiceMetricGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find unique service metric', error);
        }
    }

    async findFirst<T extends Prisma.ServiceMetricFindFirstArgs>(
        params: T,
    ): Promise<Prisma.ServiceMetricGetPayload<T> | null> {
        try {
            return (await this.prisma.serviceMetric.findFirst(
                params,
            )) as Prisma.ServiceMetricGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find first service metric', error);
        }
    }

    async findMany<T extends Prisma.ServiceMetricFindManyArgs>(
        params: T,
    ): Promise<Prisma.ServiceMetricGetPayload<T>[]> {
        try {
            return (await this.prisma.serviceMetric.findMany(
                params,
            )) as Prisma.ServiceMetricGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find service metrics', error);
        }
    }

    async create<T extends Prisma.ServiceMetricCreateArgs>(
        params: T,
    ): Promise<Prisma.ServiceMetricGetPayload<T>> {
        try {
            return (await this.prisma.serviceMetric.create(
                params,
            )) as Prisma.ServiceMetricGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create service metric', error);
        }
    }

    async createMany(params: Prisma.ServiceMetricCreateManyArgs) {
        try {
            return await this.prisma.serviceMetric.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create service metrics', error);
        }
    }

    async update<T extends Prisma.ServiceMetricUpdateArgs>(
        params: T,
    ): Promise<Prisma.ServiceMetricGetPayload<T>> {
        try {
            return (await this.prisma.serviceMetric.update(
                params,
            )) as Prisma.ServiceMetricGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update service metric', error);
        }
    }

    async updateMany(params: Prisma.ServiceMetricUpdateManyArgs) {
        try {
            return await this.prisma.serviceMetric.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update service metrics', error);
        }
    }

    async upsert<T extends Prisma.ServiceMetricUpsertArgs>(
        params: T,
    ): Promise<Prisma.ServiceMetricGetPayload<T>> {
        try {
            return (await this.prisma.serviceMetric.upsert(
                params,
            )) as Prisma.ServiceMetricGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to upsert service metric', error);
        }
    }

    async delete<T extends Prisma.ServiceMetricDeleteArgs>(
        params: T,
    ): Promise<Prisma.ServiceMetricGetPayload<T>> {
        try {
            return (await this.prisma.serviceMetric.delete(
                params,
            )) as Prisma.ServiceMetricGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete service metric', error);
        }
    }

    async deleteMany(params: Prisma.ServiceMetricDeleteManyArgs) {
        try {
            return await this.prisma.serviceMetric.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete service metrics', error);
        }
    }

    async count(params?: Prisma.ServiceMetricCountArgs): Promise<number> {
        try {
            return await this.prisma.serviceMetric.count(params);
        } catch (error) {
            throw new RepoError('Failed to count service metrics', error);
        }
    }
}
