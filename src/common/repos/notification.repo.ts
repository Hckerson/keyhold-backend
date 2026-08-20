import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class NotificationRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.NotificationFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.NotificationGetPayload<T> | null> {
        try {
            return (await this.prisma.notification.findUnique(
                params,
            )) as Prisma.NotificationGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find unique notification', error);
        }
    }

    async findFirst<T extends Prisma.NotificationFindFirstArgs>(
        params: T,
    ): Promise<Prisma.NotificationGetPayload<T> | null> {
        try {
            return (await this.prisma.notification.findFirst(
                params,
            )) as Prisma.NotificationGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find first notification', error);
        }
    }

    async findMany<T extends Prisma.NotificationFindManyArgs>(
        params: T,
    ): Promise<Prisma.NotificationGetPayload<T>[]> {
        try {
            return (await this.prisma.notification.findMany(
                params,
            )) as Prisma.NotificationGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find notifications', error);
        }
    }

    async create<T extends Prisma.NotificationCreateArgs>(
        params: T,
    ): Promise<Prisma.NotificationGetPayload<T>> {
        try {
            return (await this.prisma.notification.create(
                params,
            )) as Prisma.NotificationGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create notification', error);
        }
    }

    async createMany(params: Prisma.NotificationCreateManyArgs) {
        try {
            return await this.prisma.notification.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create notifications', error);
        }
    }

    async update<T extends Prisma.NotificationUpdateArgs>(
        params: T,
    ): Promise<Prisma.NotificationGetPayload<T>> {
        try {
            return (await this.prisma.notification.update(
                params,
            )) as Prisma.NotificationGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update notification', error);
        }
    }

    async updateMany(params: Prisma.NotificationUpdateManyArgs) {
        try {
            return await this.prisma.notification.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update notifications', error);
        }
    }

    async delete<T extends Prisma.NotificationDeleteArgs>(
        params: T,
    ): Promise<Prisma.NotificationGetPayload<T>> {
        try {
            return (await this.prisma.notification.delete(
                params,
            )) as Prisma.NotificationGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete notification', error);
        }
    }

    async deleteMany(params: Prisma.NotificationDeleteManyArgs) {
        try {
            return await this.prisma.notification.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete notifications', error);
        }
    }

    async count(params?: Prisma.NotificationCountArgs): Promise<number> {
        try {
            return await this.prisma.notification.count(params);
        } catch (error) {
            throw new RepoError('Failed to count notifications', error);
        }
    }
}
