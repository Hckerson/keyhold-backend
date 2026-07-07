import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class ViewingRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.ViewingFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.ViewingGetPayload<T> | null> {
        try {
            return (await this.prisma.viewing.findUnique(params)) as Prisma.ViewingGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find unique viewing', error);
        }
    }

    async findFirst<T extends Prisma.ViewingFindFirstArgs>(
        params: T,
    ): Promise<Prisma.ViewingGetPayload<T> | null> {
        try {
            return (await this.prisma.viewing.findFirst(params)) as Prisma.ViewingGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find first viewing', error);
        }
    }

    async findMany<T extends Prisma.ViewingFindManyArgs>(
        params: T,
    ): Promise<Prisma.ViewingGetPayload<T>[]> {
        try {
            return (await this.prisma.viewing.findMany(params)) as Prisma.ViewingGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find viewings', error);
        }
    }

    async create<T extends Prisma.ViewingCreateArgs>(
        params: T,
    ): Promise<Prisma.ViewingGetPayload<T>> {
        try {
            return (await this.prisma.viewing.create(params)) as Prisma.ViewingGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create viewing', error);
        }
    }

    async createMany(params: Prisma.ViewingCreateManyArgs) {
        try {
            return await this.prisma.viewing.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create viewings', error);
        }
    }

    async update<T extends Prisma.ViewingUpdateArgs>(
        params: T,
    ): Promise<Prisma.ViewingGetPayload<T>> {
        try {
            return (await this.prisma.viewing.update(params)) as Prisma.ViewingGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update viewing', error);
        }
    }

    async updateMany(params: Prisma.ViewingUpdateManyArgs) {
        try {
            return await this.prisma.viewing.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update viewings', error);
        }
    }

    async delete<T extends Prisma.ViewingDeleteArgs>(
        params: T,
    ): Promise<Prisma.ViewingGetPayload<T>> {
        try {
            return (await this.prisma.viewing.delete(params)) as Prisma.ViewingGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete viewing', error);
        }
    }

    async deleteMany(params: Prisma.ViewingDeleteManyArgs) {
        try {
            return await this.prisma.viewing.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete viewings', error);
        }
    }

    async count(params?: Prisma.ViewingCountArgs): Promise<number> {
        try {
            return await this.prisma.viewing.count(params);
        } catch (error) {
            throw new RepoError('Failed to count viewings', error);
        }
    }
}
