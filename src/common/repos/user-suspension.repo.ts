import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class UserSuspensionRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.UserSuspensionFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.UserSuspensionGetPayload<T> | null> {
        try {
            return (await this.prisma.userSuspension.findUnique(params)) as Prisma.UserSuspensionGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find unique user suspension', error);
        }
    }

    async findFirst<T extends Prisma.UserSuspensionFindFirstArgs>(
        params: T,
    ): Promise<Prisma.UserSuspensionGetPayload<T> | null> {
        try {
            return (await this.prisma.userSuspension.findFirst(params)) as Prisma.UserSuspensionGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find first user suspension', error);
        }
    }

    async findMany<T extends Prisma.UserSuspensionFindManyArgs>(
        params: T,
    ): Promise<Prisma.UserSuspensionGetPayload<T>[]> {
        try {
            return (await this.prisma.userSuspension.findMany(params)) as Prisma.UserSuspensionGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find user suspensions', error);
        }
    }

    async create<T extends Prisma.UserSuspensionCreateArgs>(
        params: T,
    ): Promise<Prisma.UserSuspensionGetPayload<T>> {
        try {
            return (await this.prisma.userSuspension.create(params)) as Prisma.UserSuspensionGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create user suspension', error);
        }
    }

    async createMany(params: Prisma.UserSuspensionCreateManyArgs) {
        try {
            return await this.prisma.userSuspension.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create user suspensions', error);
        }
    }

    async update<T extends Prisma.UserSuspensionUpdateArgs>(
        params: T,
    ): Promise<Prisma.UserSuspensionGetPayload<T>> {
        try {
            return (await this.prisma.userSuspension.update(params)) as Prisma.UserSuspensionGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update user suspension', error);
        }
    }

    async updateMany(params: Prisma.UserSuspensionUpdateManyArgs) {
        try {
            return await this.prisma.userSuspension.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update user suspensions', error);
        }
    }

    async delete<T extends Prisma.UserSuspensionDeleteArgs>(
        params: T,
    ): Promise<Prisma.UserSuspensionGetPayload<T>> {
        try {
            return (await this.prisma.userSuspension.delete(params)) as Prisma.UserSuspensionGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete user suspension', error);
        }
    }

    async deleteMany(params: Prisma.UserSuspensionDeleteManyArgs) {
        try {
            return await this.prisma.userSuspension.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete user suspensions', error);
        }
    }

    async count(params?: Prisma.UserSuspensionCountArgs): Promise<number> {
        try {
            return await this.prisma.userSuspension.count(params);
        } catch (error) {
            throw new RepoError('Failed to count user suspensions', error);
        }
    }
}
