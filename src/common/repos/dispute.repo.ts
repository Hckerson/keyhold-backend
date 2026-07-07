import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class DisputeRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.DisputeFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.DisputeGetPayload<T> | null> {
        try {
            return (await this.prisma.dispute.findUnique(params)) as Prisma.DisputeGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find unique dispute', error);
        }
    }

    async findFirst<T extends Prisma.DisputeFindFirstArgs>(
        params: T,
    ): Promise<Prisma.DisputeGetPayload<T> | null> {
        try {
            return (await this.prisma.dispute.findFirst(params)) as Prisma.DisputeGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find first dispute', error);
        }
    }

    async findMany<T extends Prisma.DisputeFindManyArgs>(
        params: T,
    ): Promise<Prisma.DisputeGetPayload<T>[]> {
        try {
            return (await this.prisma.dispute.findMany(params)) as Prisma.DisputeGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find disputes', error);
        }
    }

    async create<T extends Prisma.DisputeCreateArgs>(
        params: T,
    ): Promise<Prisma.DisputeGetPayload<T>> {
        try {
            return (await this.prisma.dispute.create(params)) as Prisma.DisputeGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create dispute', error);
        }
    }

    async createMany(params: Prisma.DisputeCreateManyArgs) {
        try {
            return await this.prisma.dispute.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create disputes', error);
        }
    }

    async update<T extends Prisma.DisputeUpdateArgs>(
        params: T,
    ): Promise<Prisma.DisputeGetPayload<T>> {
        try {
            return (await this.prisma.dispute.update(params)) as Prisma.DisputeGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update dispute', error);
        }
    }

    async updateMany(params: Prisma.DisputeUpdateManyArgs) {
        try {
            return await this.prisma.dispute.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update disputes', error);
        }
    }

    async delete<T extends Prisma.DisputeDeleteArgs>(
        params: T,
    ): Promise<Prisma.DisputeGetPayload<T>> {
        try {
            return (await this.prisma.dispute.delete(params)) as Prisma.DisputeGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete dispute', error);
        }
    }

    async deleteMany(params: Prisma.DisputeDeleteManyArgs) {
        try {
            return await this.prisma.dispute.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete disputes', error);
        }
    }

    async count(params?: Prisma.DisputeCountArgs): Promise<number> {
        try {
            return await this.prisma.dispute.count(params);
        } catch (error) {
            throw new RepoError('Failed to count disputes', error);
        }
    }
}
