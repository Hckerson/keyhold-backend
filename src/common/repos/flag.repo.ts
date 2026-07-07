import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class FlagRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.FlagFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.FlagGetPayload<T> | null> {
        try {
            return (await this.prisma.flag.findUnique(params)) as Prisma.FlagGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find unique flag', error);
        }
    }

    async findFirst<T extends Prisma.FlagFindFirstArgs>(
        params: T,
    ): Promise<Prisma.FlagGetPayload<T> | null> {
        try {
            return (await this.prisma.flag.findFirst(params)) as Prisma.FlagGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find first flag', error);
        }
    }

    async findMany<T extends Prisma.FlagFindManyArgs>(
        params: T,
    ): Promise<Prisma.FlagGetPayload<T>[]> {
        try {
            return (await this.prisma.flag.findMany(params)) as Prisma.FlagGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find flags', error);
        }
    }

    async create<T extends Prisma.FlagCreateArgs>(
        params: T,
    ): Promise<Prisma.FlagGetPayload<T>> {
        try {
            return (await this.prisma.flag.create(params)) as Prisma.FlagGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create flag', error);
        }
    }

    async createMany(params: Prisma.FlagCreateManyArgs) {
        try {
            return await this.prisma.flag.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create flags', error);
        }
    }

    async update<T extends Prisma.FlagUpdateArgs>(
        params: T,
    ): Promise<Prisma.FlagGetPayload<T>> {
        try {
            return (await this.prisma.flag.update(params)) as Prisma.FlagGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update flag', error);
        }
    }

    async updateMany(params: Prisma.FlagUpdateManyArgs) {
        try {
            return await this.prisma.flag.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update flags', error);
        }
    }

    async delete<T extends Prisma.FlagDeleteArgs>(
        params: T,
    ): Promise<Prisma.FlagGetPayload<T>> {
        try {
            return (await this.prisma.flag.delete(params)) as Prisma.FlagGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete flag', error);
        }
    }

    async deleteMany(params: Prisma.FlagDeleteManyArgs) {
        try {
            return await this.prisma.flag.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete flags', error);
        }
    }

    async count(params?: Prisma.FlagCountArgs): Promise<number> {
        try {
            return await this.prisma.flag.count(params);
        } catch (error) {
            throw new RepoError('Failed to count flags', error);
        }
    }
}
