import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class UserRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.UserFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.UserGetPayload<T> | null> {
        try {
            return (await this.prisma.user.findUnique(
                params,
            )) as Prisma.UserGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find unique user', error);
        }
    }

    async findFirst<T extends Prisma.UserFindFirstArgs>(
        params: T,
    ): Promise<Prisma.UserGetPayload<T> | null> {
        try {
            return (await this.prisma.user.findFirst(
                params,
            )) as Prisma.UserGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find first user', error);
        }
    }

    async findMany<T extends Prisma.UserFindManyArgs>(
        params: T,
    ): Promise<Prisma.UserGetPayload<T>[]> {
        try {
            return (await this.prisma.user.findMany(
                params,
            )) as Prisma.UserGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find users', error);
        }
    }

    async create<T extends Prisma.UserCreateArgs>(
        params: T,
    ): Promise<Prisma.UserGetPayload<T>> {
        try {
            return (await this.prisma.user.create(
                params,
            )) as Prisma.UserGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create user', error);
        }
    }

    async createMany(params: Prisma.UserCreateManyArgs) {
        try {
            return await this.prisma.user.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create users', error);
        }
    }

    async update<T extends Prisma.UserUpdateArgs>(
        params: T,
    ): Promise<Prisma.UserGetPayload<T>> {
        try {
            return (await this.prisma.user.update(
                params,
            )) as Prisma.UserGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update user', error);
        }
    }

    async updateMany(params: Prisma.UserUpdateManyArgs) {
        try {
            return await this.prisma.user.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update users', error);
        }
    }

    async delete<T extends Prisma.UserDeleteArgs>(
        params: T,
    ): Promise<Prisma.UserGetPayload<T>> {
        try {
            return (await this.prisma.user.delete(
                params,
            )) as Prisma.UserGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete user', error);
        }
    }

    async deleteMany(params: Prisma.UserDeleteManyArgs) {
        try {
            return await this.prisma.user.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete users', error);
        }
    }

    async count(params?: Prisma.UserCountArgs): Promise<number> {
        try {
            return await this.prisma.user.count(params);
        } catch (error) {
            throw new RepoError('Failed to count users', error);
        }
    }

    async groupBy(params: Prisma.UserGroupByArgs) {
        try {
            return await this.prisma.user.groupBy(params as any);
        } catch (error) {
            throw new RepoError('Failed to group users', error);
        }
    }
}
