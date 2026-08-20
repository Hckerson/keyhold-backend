import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class PlatformSettingRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.PlatformSettingFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.PlatformSettingGetPayload<T> | null> {
        try {
            return (await this.prisma.platformSetting.findUnique(
                params,
            )) as Prisma.PlatformSettingGetPayload<T> | null;
        } catch (error) {
            throw new RepoError(
                'Failed to find unique platform setting',
                error,
            );
        }
    }

    async findFirst<T extends Prisma.PlatformSettingFindFirstArgs>(
        params: T,
    ): Promise<Prisma.PlatformSettingGetPayload<T> | null> {
        try {
            return (await this.prisma.platformSetting.findFirst(
                params,
            )) as Prisma.PlatformSettingGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find first platform setting', error);
        }
    }

    async findMany<T extends Prisma.PlatformSettingFindManyArgs>(
        params: T,
    ): Promise<Prisma.PlatformSettingGetPayload<T>[]> {
        try {
            return (await this.prisma.platformSetting.findMany(
                params,
            )) as Prisma.PlatformSettingGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find platform settings', error);
        }
    }

    async create<T extends Prisma.PlatformSettingCreateArgs>(
        params: T,
    ): Promise<Prisma.PlatformSettingGetPayload<T>> {
        try {
            return (await this.prisma.platformSetting.create(
                params,
            )) as Prisma.PlatformSettingGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create platform setting', error);
        }
    }

    async createMany(params: Prisma.PlatformSettingCreateManyArgs) {
        try {
            return await this.prisma.platformSetting.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create platform settings', error);
        }
    }

    async update<T extends Prisma.PlatformSettingUpdateArgs>(
        params: T,
    ): Promise<Prisma.PlatformSettingGetPayload<T>> {
        try {
            return (await this.prisma.platformSetting.update(
                params,
            )) as Prisma.PlatformSettingGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update platform setting', error);
        }
    }

    async updateMany(params: Prisma.PlatformSettingUpdateManyArgs) {
        try {
            return await this.prisma.platformSetting.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update platform settings', error);
        }
    }

    async delete<T extends Prisma.PlatformSettingDeleteArgs>(
        params: T,
    ): Promise<Prisma.PlatformSettingGetPayload<T>> {
        try {
            return (await this.prisma.platformSetting.delete(
                params,
            )) as Prisma.PlatformSettingGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete platform setting', error);
        }
    }

    async deleteMany(params: Prisma.PlatformSettingDeleteManyArgs) {
        try {
            return await this.prisma.platformSetting.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete platform settings', error);
        }
    }

    async upsert<T extends Prisma.PlatformSettingUpsertArgs>(
        params: T,
    ): Promise<Prisma.PlatformSettingGetPayload<T>> {
        try {
            return (await this.prisma.platformSetting.upsert(
                params,
            )) as Prisma.PlatformSettingGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to upsert platform setting', error);
        }
    }

    async count(params?: Prisma.PlatformSettingCountArgs): Promise<number> {
        try {
            return await this.prisma.platformSetting.count(params);
        } catch (error) {
            throw new RepoError('Failed to count platform settings', error);
        }
    }
}
