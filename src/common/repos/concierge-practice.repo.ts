import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { RepoError } from '@common/errors/repo.error';
import { PrismaService } from '@common/database/prisma.service';

@Injectable()
export class ConciergePracticeRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.ConciergePracticeFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.ConciergePracticeGetPayload<T> | null> {
        try {
            return (await this.prisma.conciergePractice.findUnique(
                params,
            )) as Prisma.ConciergePracticeGetPayload<T> | null;
        } catch (error) {
            throw new RepoError(
                'Failed to find unique concierge practice',
                error,
            );
        }
    }

    async findFirst<T extends Prisma.ConciergePracticeFindFirstArgs>(
        params: T,
    ): Promise<Prisma.ConciergePracticeGetPayload<T> | null> {
        try {
            return (await this.prisma.conciergePractice.findFirst(
                params,
            )) as Prisma.ConciergePracticeGetPayload<T> | null;
        } catch (error) {
            throw new RepoError(
                'Failed to find first concierge practice',
                error,
            );
        }
    }

    async findMany<T extends Prisma.ConciergePracticeFindManyArgs>(
        params: T,
    ): Promise<Prisma.ConciergePracticeGetPayload<T>[]> {
        try {
            return (await this.prisma.conciergePractice.findMany(
                params,
            )) as Prisma.ConciergePracticeGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find concierge practices', error);
        }
    }

    async create<T extends Prisma.ConciergePracticeCreateArgs>(
        params: T,
    ): Promise<Prisma.ConciergePracticeGetPayload<T>> {
        try {
            return (await this.prisma.conciergePractice.create(
                params,
            )) as Prisma.ConciergePracticeGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create concierge practice', error);
        }
    }

    async createMany(params: Prisma.ConciergePracticeCreateManyArgs) {
        try {
            return await this.prisma.conciergePractice.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create concierge practices', error);
        }
    }

    async update<T extends Prisma.ConciergePracticeUpdateArgs>(
        params: T,
    ): Promise<Prisma.ConciergePracticeGetPayload<T>> {
        try {
            return (await this.prisma.conciergePractice.update(
                params,
            )) as Prisma.ConciergePracticeGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update concierge practice', error);
        }
    }

    async updateMany(params: Prisma.ConciergePracticeUpdateManyArgs) {
        try {
            return await this.prisma.conciergePractice.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update concierge practices', error);
        }
    }

    async upsert<T extends Prisma.ConciergePracticeUpsertArgs>(
        params: T,
    ): Promise<Prisma.ConciergePracticeGetPayload<T>> {
        try {
            return (await this.prisma.conciergePractice.upsert(
                params,
            )) as Prisma.ConciergePracticeGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to upsert concierge practice', error);
        }
    }

    async delete<T extends Prisma.ConciergePracticeDeleteArgs>(
        params: T,
    ): Promise<Prisma.ConciergePracticeGetPayload<T>> {
        try {
            return (await this.prisma.conciergePractice.delete(
                params,
            )) as Prisma.ConciergePracticeGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete concierge practice', error);
        }
    }

    async deleteMany(params: Prisma.ConciergePracticeDeleteManyArgs) {
        try {
            return await this.prisma.conciergePractice.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete concierge practices', error);
        }
    }

    async count(params?: Prisma.ConciergePracticeCountArgs): Promise<number> {
        try {
            return await this.prisma.conciergePractice.count(params);
        } catch (error) {
            throw new RepoError('Failed to count concierge practices', error);
        }
    }
}
