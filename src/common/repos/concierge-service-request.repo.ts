import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { RepoError } from '@common/errors/repo.error';
import { PrismaService } from '@common/database/prisma.service';

@Injectable()
export class ConciergeServiceRequestRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.ConciergeServiceRequestFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.ConciergeServiceRequestGetPayload<T> | null> {
        try {
            return (await this.prisma.conciergeServiceRequest.findUnique(
                params,
            )) as Prisma.ConciergeServiceRequestGetPayload<T> | null;
        } catch (error) {
            throw new RepoError(
                'Failed to find unique concierge service request',
                error,
            );
        }
    }

    async findFirst<T extends Prisma.ConciergeServiceRequestFindFirstArgs>(
        params: T,
    ): Promise<Prisma.ConciergeServiceRequestGetPayload<T> | null> {
        try {
            return (await this.prisma.conciergeServiceRequest.findFirst(
                params,
            )) as Prisma.ConciergeServiceRequestGetPayload<T> | null;
        } catch (error) {
            throw new RepoError(
                'Failed to find first concierge service request',
                error,
            );
        }
    }

    async findMany<T extends Prisma.ConciergeServiceRequestFindManyArgs>(
        params: T,
    ): Promise<Prisma.ConciergeServiceRequestGetPayload<T>[]> {
        try {
            return (await this.prisma.conciergeServiceRequest.findMany(
                params,
            )) as Prisma.ConciergeServiceRequestGetPayload<T>[];
        } catch (error) {
            throw new RepoError(
                'Failed to find concierge service requests',
                error,
            );
        }
    }

    async create<T extends Prisma.ConciergeServiceRequestCreateArgs>(
        params: T,
    ): Promise<Prisma.ConciergeServiceRequestGetPayload<T>> {
        try {
            return (await this.prisma.conciergeServiceRequest.create(
                params,
            )) as Prisma.ConciergeServiceRequestGetPayload<T>;
        } catch (error) {
            throw new RepoError(
                'Failed to create concierge service request',
                error,
            );
        }
    }

    async createMany(params: Prisma.ConciergeServiceRequestCreateManyArgs) {
        try {
            return await this.prisma.conciergeServiceRequest.createMany(params);
        } catch (error) {
            throw new RepoError(
                'Failed to create concierge service requests',
                error,
            );
        }
    }

    async update<T extends Prisma.ConciergeServiceRequestUpdateArgs>(
        params: T,
    ): Promise<Prisma.ConciergeServiceRequestGetPayload<T>> {
        try {
            return (await this.prisma.conciergeServiceRequest.update(
                params,
            )) as Prisma.ConciergeServiceRequestGetPayload<T>;
        } catch (error) {
            throw new RepoError(
                'Failed to update concierge service request',
                error,
            );
        }
    }

    async updateMany(params: Prisma.ConciergeServiceRequestUpdateManyArgs) {
        try {
            return await this.prisma.conciergeServiceRequest.updateMany(params);
        } catch (error) {
            throw new RepoError(
                'Failed to update concierge service requests',
                error,
            );
        }
    }

    async upsert<T extends Prisma.ConciergeServiceRequestUpsertArgs>(
        params: T,
    ): Promise<Prisma.ConciergeServiceRequestGetPayload<T>> {
        try {
            return (await this.prisma.conciergeServiceRequest.upsert(
                params,
            )) as Prisma.ConciergeServiceRequestGetPayload<T>;
        } catch (error) {
            throw new RepoError(
                'Failed to upsert concierge service request',
                error,
            );
        }
    }

    async delete<T extends Prisma.ConciergeServiceRequestDeleteArgs>(
        params: T,
    ): Promise<Prisma.ConciergeServiceRequestGetPayload<T>> {
        try {
            return (await this.prisma.conciergeServiceRequest.delete(
                params,
            )) as Prisma.ConciergeServiceRequestGetPayload<T>;
        } catch (error) {
            throw new RepoError(
                'Failed to delete concierge service request',
                error,
            );
        }
    }

    async deleteMany(params: Prisma.ConciergeServiceRequestDeleteManyArgs) {
        try {
            return await this.prisma.conciergeServiceRequest.deleteMany(params);
        } catch (error) {
            throw new RepoError(
                'Failed to delete concierge service requests',
                error,
            );
        }
    }

    async count(
        params?: Prisma.ConciergeServiceRequestCountArgs,
    ): Promise<number> {
        try {
            return await this.prisma.conciergeServiceRequest.count(params);
        } catch (error) {
            throw new RepoError(
                'Failed to count concierge service requests',
                error,
            );
        }
    }
}
