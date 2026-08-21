import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { RepoError } from '@common/errors/repo.error';
import { PrismaService } from '@common/database/prisma.service';

@Injectable()
export class ConciergeServiceRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.ConciergeServiceFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.ConciergeServiceGetPayload<T> | null> {
        try {
            return (await this.prisma.conciergeService.findUnique(
                params,
            )) as Prisma.ConciergeServiceGetPayload<T> | null;
        } catch (error) {
            throw new RepoError(
                'Failed to find unique concierge service',
                error,
            );
        }
    }

    async findFirst<T extends Prisma.ConciergeServiceFindFirstArgs>(
        params: T,
    ): Promise<Prisma.ConciergeServiceGetPayload<T> | null> {
        try {
            return (await this.prisma.conciergeService.findFirst(
                params,
            )) as Prisma.ConciergeServiceGetPayload<T> | null;
        } catch (error) {
            throw new RepoError(
                'Failed to find first concierge service',
                error,
            );
        }
    }

    async findMany<T extends Prisma.ConciergeServiceFindManyArgs>(
        params: T,
    ): Promise<Prisma.ConciergeServiceGetPayload<T>[]> {
        try {
            return (await this.prisma.conciergeService.findMany(
                params,
            )) as Prisma.ConciergeServiceGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find concierge services', error);
        }
    }

    async create<T extends Prisma.ConciergeServiceCreateArgs>(
        params: T,
    ): Promise<Prisma.ConciergeServiceGetPayload<T>> {
        try {
            return (await this.prisma.conciergeService.create(
                params,
            )) as Prisma.ConciergeServiceGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create concierge service', error);
        }
    }

    async createMany(params: Prisma.ConciergeServiceCreateManyArgs) {
        try {
            return await this.prisma.conciergeService.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create concierge services', error);
        }
    }

    async update<T extends Prisma.ConciergeServiceUpdateArgs>(
        params: T,
    ): Promise<Prisma.ConciergeServiceGetPayload<T>> {
        try {
            return (await this.prisma.conciergeService.update(
                params,
            )) as Prisma.ConciergeServiceGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update concierge service', error);
        }
    }

    async updateMany(params: Prisma.ConciergeServiceUpdateManyArgs) {
        try {
            return await this.prisma.conciergeService.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update concierge services', error);
        }
    }

    async upsert<T extends Prisma.ConciergeServiceUpsertArgs>(
        params: T,
    ): Promise<Prisma.ConciergeServiceGetPayload<T>> {
        try {
            return (await this.prisma.conciergeService.upsert(
                params,
            )) as Prisma.ConciergeServiceGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to upsert concierge service', error);
        }
    }

    async delete<T extends Prisma.ConciergeServiceDeleteArgs>(
        params: T,
    ): Promise<Prisma.ConciergeServiceGetPayload<T>> {
        try {
            return (await this.prisma.conciergeService.delete(
                params,
            )) as Prisma.ConciergeServiceGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete concierge service', error);
        }
    }

    async deleteMany(params: Prisma.ConciergeServiceDeleteManyArgs) {
        try {
            return await this.prisma.conciergeService.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete concierge services', error);
        }
    }

    async count(params?: Prisma.ConciergeServiceCountArgs): Promise<number> {
        try {
            return await this.prisma.conciergeService.count(params);
        } catch (error) {
            throw new RepoError('Failed to count concierge services', error);
        }
    }
}
