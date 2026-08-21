import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { RepoError } from '@common/errors/repo.error';
import { PrismaService } from '@common/database/prisma.service';

@Injectable()
export class SavedSearchRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.SavedSearchFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.SavedSearchGetPayload<T> | null> {
        try {
            return (await this.prisma.savedSearch.findUnique(
                params,
            )) as Prisma.SavedSearchGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find unique saved search', error);
        }
    }

    async findFirst<T extends Prisma.SavedSearchFindFirstArgs>(
        params: T,
    ): Promise<Prisma.SavedSearchGetPayload<T> | null> {
        try {
            return (await this.prisma.savedSearch.findFirst(
                params,
            )) as Prisma.SavedSearchGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find first saved search', error);
        }
    }

    async findMany<T extends Prisma.SavedSearchFindManyArgs>(
        params: T,
    ): Promise<Prisma.SavedSearchGetPayload<T>[]> {
        try {
            return (await this.prisma.savedSearch.findMany(
                params,
            )) as Prisma.SavedSearchGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find saved searches', error);
        }
    }

    async create<T extends Prisma.SavedSearchCreateArgs>(
        params: T,
    ): Promise<Prisma.SavedSearchGetPayload<T>> {
        try {
            return (await this.prisma.savedSearch.create(
                params,
            )) as Prisma.SavedSearchGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create saved search', error);
        }
    }

    async createMany(params: Prisma.SavedSearchCreateManyArgs) {
        try {
            return await this.prisma.savedSearch.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create saved searches', error);
        }
    }

    async update<T extends Prisma.SavedSearchUpdateArgs>(
        params: T,
    ): Promise<Prisma.SavedSearchGetPayload<T>> {
        try {
            return (await this.prisma.savedSearch.update(
                params,
            )) as Prisma.SavedSearchGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update saved search', error);
        }
    }

    async updateMany(params: Prisma.SavedSearchUpdateManyArgs) {
        try {
            return await this.prisma.savedSearch.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update saved searches', error);
        }
    }

    async upsert<T extends Prisma.SavedSearchUpsertArgs>(
        params: T,
    ): Promise<Prisma.SavedSearchGetPayload<T>> {
        try {
            return (await this.prisma.savedSearch.upsert(
                params,
            )) as Prisma.SavedSearchGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to upsert saved search', error);
        }
    }

    async delete<T extends Prisma.SavedSearchDeleteArgs>(
        params: T,
    ): Promise<Prisma.SavedSearchGetPayload<T>> {
        try {
            return (await this.prisma.savedSearch.delete(
                params,
            )) as Prisma.SavedSearchGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete saved search', error);
        }
    }

    async deleteMany(params: Prisma.SavedSearchDeleteManyArgs) {
        try {
            return await this.prisma.savedSearch.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete saved searches', error);
        }
    }

    async count(params?: Prisma.SavedSearchCountArgs): Promise<number> {
        try {
            return await this.prisma.savedSearch.count(params);
        } catch (error) {
            throw new RepoError('Failed to count saved searches', error);
        }
    }
}
