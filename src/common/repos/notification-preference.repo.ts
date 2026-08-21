import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class NotificationPreferenceRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.NotificationPreferenceFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.NotificationPreferenceGetPayload<T> | null> {
        try {
            return (await this.prisma.notificationPreference.findUnique(
                params,
            )) as Prisma.NotificationPreferenceGetPayload<T> | null;
        } catch (error) {
            throw new RepoError(
                'Failed to find unique notification preference',
                error,
            );
        }
    }

    async findFirst<T extends Prisma.NotificationPreferenceFindFirstArgs>(
        params: T,
    ): Promise<Prisma.NotificationPreferenceGetPayload<T> | null> {
        try {
            return (await this.prisma.notificationPreference.findFirst(
                params,
            )) as Prisma.NotificationPreferenceGetPayload<T> | null;
        } catch (error) {
            throw new RepoError(
                'Failed to find first notification preference',
                error,
            );
        }
    }

    async findMany<T extends Prisma.NotificationPreferenceFindManyArgs>(
        params: T,
    ): Promise<Prisma.NotificationPreferenceGetPayload<T>[]> {
        try {
            return (await this.prisma.notificationPreference.findMany(
                params,
            )) as Prisma.NotificationPreferenceGetPayload<T>[];
        } catch (error) {
            throw new RepoError(
                'Failed to find notification preferences',
                error,
            );
        }
    }

    async create<T extends Prisma.NotificationPreferenceCreateArgs>(
        params: T,
    ): Promise<Prisma.NotificationPreferenceGetPayload<T>> {
        try {
            return (await this.prisma.notificationPreference.create(
                params,
            )) as Prisma.NotificationPreferenceGetPayload<T>;
        } catch (error) {
            throw new RepoError(
                'Failed to create notification preference',
                error,
            );
        }
    }

    async createMany(params: Prisma.NotificationPreferenceCreateManyArgs) {
        try {
            return await this.prisma.notificationPreference.createMany(params);
        } catch (error) {
            throw new RepoError(
                'Failed to create notification preferences',
                error,
            );
        }
    }

    async update<T extends Prisma.NotificationPreferenceUpdateArgs>(
        params: T,
    ): Promise<Prisma.NotificationPreferenceGetPayload<T>> {
        try {
            return (await this.prisma.notificationPreference.update(
                params,
            )) as Prisma.NotificationPreferenceGetPayload<T>;
        } catch (error) {
            throw new RepoError(
                'Failed to update notification preference',
                error,
            );
        }
    }

    async updateMany(params: Prisma.NotificationPreferenceUpdateManyArgs) {
        try {
            return await this.prisma.notificationPreference.updateMany(params);
        } catch (error) {
            throw new RepoError(
                'Failed to update notification preferences',
                error,
            );
        }
    }

    async delete<T extends Prisma.NotificationPreferenceDeleteArgs>(
        params: T,
    ): Promise<Prisma.NotificationPreferenceGetPayload<T>> {
        try {
            return (await this.prisma.notificationPreference.delete(
                params,
            )) as Prisma.NotificationPreferenceGetPayload<T>;
        } catch (error) {
            throw new RepoError(
                'Failed to delete notification preference',
                error,
            );
        }
    }

    async deleteMany(params: Prisma.NotificationPreferenceDeleteManyArgs) {
        try {
            return await this.prisma.notificationPreference.deleteMany(params);
        } catch (error) {
            throw new RepoError(
                'Failed to delete notification preferences',
                error,
            );
        }
    }

    async upsert<T extends Prisma.NotificationPreferenceUpsertArgs>(
        params: T,
    ): Promise<Prisma.NotificationPreferenceGetPayload<T>> {
        try {
            return (await this.prisma.notificationPreference.upsert(
                params,
            )) as Prisma.NotificationPreferenceGetPayload<T>;
        } catch (error) {
            throw new RepoError(
                'Failed to upsert notification preference',
                error,
            );
        }
    }

    async count(
        params?: Prisma.NotificationPreferenceCountArgs,
    ): Promise<number> {
        try {
            return await this.prisma.notificationPreference.count(params);
        } catch (error) {
            throw new RepoError(
                'Failed to count notification preferences',
                error,
            );
        }
    }
}
