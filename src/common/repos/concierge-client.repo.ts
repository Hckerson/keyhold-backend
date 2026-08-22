import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { RepoError } from '@common/errors/repo.error';
import { PrismaService } from '@common/database/prisma.service';

@Injectable()
export class ConciergeClientRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.ConciergeClientFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.ConciergeClientGetPayload<T> | null> {
        try {
            return (await this.prisma.conciergeClient.findUnique(
                params,
            )) as Prisma.ConciergeClientGetPayload<T> | null;
        } catch (error) {
            throw new RepoError(
                'Failed to find unique concierge client',
                error,
            );
        }
    }

    async findFirst<T extends Prisma.ConciergeClientFindFirstArgs>(
        params: T,
    ): Promise<Prisma.ConciergeClientGetPayload<T> | null> {
        try {
            return (await this.prisma.conciergeClient.findFirst(
                params,
            )) as Prisma.ConciergeClientGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find first concierge client', error);
        }
    }

    async findMany<T extends Prisma.ConciergeClientFindManyArgs>(
        params: T,
    ): Promise<Prisma.ConciergeClientGetPayload<T>[]> {
        try {
            return (await this.prisma.conciergeClient.findMany(
                params,
            )) as Prisma.ConciergeClientGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find concierge clients', error);
        }
    }

    async create<T extends Prisma.ConciergeClientCreateArgs>(
        params: T,
    ): Promise<Prisma.ConciergeClientGetPayload<T>> {
        try {
            return (await this.prisma.conciergeClient.create(
                params,
            )) as Prisma.ConciergeClientGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create concierge client', error);
        }
    }

    async createMany(params: Prisma.ConciergeClientCreateManyArgs) {
        try {
            return await this.prisma.conciergeClient.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create concierge clients', error);
        }
    }

    async update<T extends Prisma.ConciergeClientUpdateArgs>(
        params: T,
    ): Promise<Prisma.ConciergeClientGetPayload<T>> {
        try {
            return (await this.prisma.conciergeClient.update(
                params,
            )) as Prisma.ConciergeClientGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update concierge client', error);
        }
    }

    async updateMany(params: Prisma.ConciergeClientUpdateManyArgs) {
        try {
            return await this.prisma.conciergeClient.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update concierge clients', error);
        }
    }

    async upsert<T extends Prisma.ConciergeClientUpsertArgs>(
        params: T,
    ): Promise<Prisma.ConciergeClientGetPayload<T>> {
        try {
            return (await this.prisma.conciergeClient.upsert(
                params,
            )) as Prisma.ConciergeClientGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to upsert concierge client', error);
        }
    }

    async delete<T extends Prisma.ConciergeClientDeleteArgs>(
        params: T,
    ): Promise<Prisma.ConciergeClientGetPayload<T>> {
        try {
            return (await this.prisma.conciergeClient.delete(
                params,
            )) as Prisma.ConciergeClientGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete concierge client', error);
        }
    }

    async deleteMany(params: Prisma.ConciergeClientDeleteManyArgs) {
        try {
            return await this.prisma.conciergeClient.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete concierge clients', error);
        }
    }

    async count(params?: Prisma.ConciergeClientCountArgs): Promise<number> {
        try {
            return await this.prisma.conciergeClient.count(params);
        } catch (error) {
            throw new RepoError('Failed to count concierge clients', error);
        }
    }
}
