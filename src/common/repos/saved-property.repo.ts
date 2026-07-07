import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { RepoError } from '@common/errors/repo.error';
import { PrismaService } from '@common/database/prisma.service';

@Injectable()
export class SavedPropertyRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.SavedPropertyFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.SavedPropertyGetPayload<T> | null> {
        try {
            return (await this.prisma.savedProperty.findUnique(params)) as Prisma.SavedPropertyGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find unique saved property', error);
        }
    }

    async findFirst<T extends Prisma.SavedPropertyFindFirstArgs>(
        params: T,
    ): Promise<Prisma.SavedPropertyGetPayload<T> | null> {
        try {
            return (await this.prisma.savedProperty.findFirst(params)) as Prisma.SavedPropertyGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find first saved property', error);
        }
    }

    async findMany<T extends Prisma.SavedPropertyFindManyArgs>(
        params: T,
    ): Promise<Prisma.SavedPropertyGetPayload<T>[]> {
        try {
            return (await this.prisma.savedProperty.findMany(params)) as Prisma.SavedPropertyGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find saved properties', error);
        }
    }

    async create<T extends Prisma.SavedPropertyCreateArgs>(
        params: T,
    ): Promise<Prisma.SavedPropertyGetPayload<T>> {
        try {
            return (await this.prisma.savedProperty.create(params)) as Prisma.SavedPropertyGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create saved property', error);
        }
    }

    async createMany(params: Prisma.SavedPropertyCreateManyArgs) {
        try {
            return await this.prisma.savedProperty.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create saved properties', error);
        }
    }

    async update<T extends Prisma.SavedPropertyUpdateArgs>(
        params: T,
    ): Promise<Prisma.SavedPropertyGetPayload<T>> {
        try {
            return (await this.prisma.savedProperty.update(params)) as Prisma.SavedPropertyGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update saved property', error);
        }
    }

    async updateMany(params: Prisma.SavedPropertyUpdateManyArgs) {
        try {
            return await this.prisma.savedProperty.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update saved properties', error);
        }
    }

    async delete<T extends Prisma.SavedPropertyDeleteArgs>(
        params: T,
    ): Promise<Prisma.SavedPropertyGetPayload<T>> {
        try {
            return (await this.prisma.savedProperty.delete(params)) as Prisma.SavedPropertyGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete saved property', error);
        }
    }

    async deleteMany(params: Prisma.SavedPropertyDeleteManyArgs) {
        try {
            return await this.prisma.savedProperty.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete saved properties', error);
        }
    }

    async count(params?: Prisma.SavedPropertyCountArgs): Promise<number> {
        try {
            return await this.prisma.savedProperty.count(params);
        } catch (error) {
            throw new RepoError('Failed to count saved properties', error);
        }
    }
}
