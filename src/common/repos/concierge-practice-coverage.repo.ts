import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { RepoError } from '@common/errors/repo.error';
import { PrismaService } from '@common/database/prisma.service';

@Injectable()
export class ConciergePracticeCoverageRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.ConciergePracticeCoverageFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.ConciergePracticeCoverageGetPayload<T> | null> {
        try {
            return (await this.prisma.conciergePracticeCoverage.findUnique(
                params,
            )) as Prisma.ConciergePracticeCoverageGetPayload<T> | null;
        } catch (error) {
            throw new RepoError(
                'Failed to find unique concierge practice coverage',
                error,
            );
        }
    }

    async findFirst<T extends Prisma.ConciergePracticeCoverageFindFirstArgs>(
        params: T,
    ): Promise<Prisma.ConciergePracticeCoverageGetPayload<T> | null> {
        try {
            return (await this.prisma.conciergePracticeCoverage.findFirst(
                params,
            )) as Prisma.ConciergePracticeCoverageGetPayload<T> | null;
        } catch (error) {
            throw new RepoError(
                'Failed to find first concierge practice coverage',
                error,
            );
        }
    }

    async findMany<T extends Prisma.ConciergePracticeCoverageFindManyArgs>(
        params: T,
    ): Promise<Prisma.ConciergePracticeCoverageGetPayload<T>[]> {
        try {
            return (await this.prisma.conciergePracticeCoverage.findMany(
                params,
            )) as Prisma.ConciergePracticeCoverageGetPayload<T>[];
        } catch (error) {
            throw new RepoError(
                'Failed to find concierge practice coverage',
                error,
            );
        }
    }

    async create<T extends Prisma.ConciergePracticeCoverageCreateArgs>(
        params: T,
    ): Promise<Prisma.ConciergePracticeCoverageGetPayload<T>> {
        try {
            return (await this.prisma.conciergePracticeCoverage.create(
                params,
            )) as Prisma.ConciergePracticeCoverageGetPayload<T>;
        } catch (error) {
            throw new RepoError(
                'Failed to create concierge practice coverage',
                error,
            );
        }
    }

    async createMany(params: Prisma.ConciergePracticeCoverageCreateManyArgs) {
        try {
            return await this.prisma.conciergePracticeCoverage.createMany(
                params,
            );
        } catch (error) {
            throw new RepoError(
                'Failed to create concierge practice coverage',
                error,
            );
        }
    }

    async update<T extends Prisma.ConciergePracticeCoverageUpdateArgs>(
        params: T,
    ): Promise<Prisma.ConciergePracticeCoverageGetPayload<T>> {
        try {
            return (await this.prisma.conciergePracticeCoverage.update(
                params,
            )) as Prisma.ConciergePracticeCoverageGetPayload<T>;
        } catch (error) {
            throw new RepoError(
                'Failed to update concierge practice coverage',
                error,
            );
        }
    }

    async updateMany(params: Prisma.ConciergePracticeCoverageUpdateManyArgs) {
        try {
            return await this.prisma.conciergePracticeCoverage.updateMany(
                params,
            );
        } catch (error) {
            throw new RepoError(
                'Failed to update concierge practice coverage',
                error,
            );
        }
    }

    async upsert<T extends Prisma.ConciergePracticeCoverageUpsertArgs>(
        params: T,
    ): Promise<Prisma.ConciergePracticeCoverageGetPayload<T>> {
        try {
            return (await this.prisma.conciergePracticeCoverage.upsert(
                params,
            )) as Prisma.ConciergePracticeCoverageGetPayload<T>;
        } catch (error) {
            throw new RepoError(
                'Failed to upsert concierge practice coverage',
                error,
            );
        }
    }

    async delete<T extends Prisma.ConciergePracticeCoverageDeleteArgs>(
        params: T,
    ): Promise<Prisma.ConciergePracticeCoverageGetPayload<T>> {
        try {
            return (await this.prisma.conciergePracticeCoverage.delete(
                params,
            )) as Prisma.ConciergePracticeCoverageGetPayload<T>;
        } catch (error) {
            throw new RepoError(
                'Failed to delete concierge practice coverage',
                error,
            );
        }
    }

    async deleteMany(params: Prisma.ConciergePracticeCoverageDeleteManyArgs) {
        try {
            return await this.prisma.conciergePracticeCoverage.deleteMany(
                params,
            );
        } catch (error) {
            throw new RepoError(
                'Failed to delete concierge practice coverage',
                error,
            );
        }
    }

    async count(
        params?: Prisma.ConciergePracticeCoverageCountArgs,
    ): Promise<number> {
        try {
            return await this.prisma.conciergePracticeCoverage.count(params);
        } catch (error) {
            throw new RepoError(
                'Failed to count concierge practice coverage',
                error,
            );
        }
    }
}
