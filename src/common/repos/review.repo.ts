import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class ReviewRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.ReviewFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.ReviewGetPayload<T> | null> {
        try {
            return (await this.prisma.review.findUnique(params)) as Prisma.ReviewGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find unique review', error);
        }
    }

    async findFirst<T extends Prisma.ReviewFindFirstArgs>(
        params: T,
    ): Promise<Prisma.ReviewGetPayload<T> | null> {
        try {
            return (await this.prisma.review.findFirst(params)) as Prisma.ReviewGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find first review', error);
        }
    }

    async findMany<T extends Prisma.ReviewFindManyArgs>(
        params: T,
    ): Promise<Prisma.ReviewGetPayload<T>[]> {
        try {
            return (await this.prisma.review.findMany(params)) as Prisma.ReviewGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find reviews', error);
        }
    }

    async create<T extends Prisma.ReviewCreateArgs>(
        params: T,
    ): Promise<Prisma.ReviewGetPayload<T>> {
        try {
            return (await this.prisma.review.create(params)) as Prisma.ReviewGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create review', error);
        }
    }

    async createMany(params: Prisma.ReviewCreateManyArgs) {
        try {
            return await this.prisma.review.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create reviews', error);
        }
    }

    async update<T extends Prisma.ReviewUpdateArgs>(
        params: T,
    ): Promise<Prisma.ReviewGetPayload<T>> {
        try {
            return (await this.prisma.review.update(params)) as Prisma.ReviewGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update review', error);
        }
    }

    async updateMany(params: Prisma.ReviewUpdateManyArgs) {
        try {
            return await this.prisma.review.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update reviews', error);
        }
    }

    async delete<T extends Prisma.ReviewDeleteArgs>(
        params: T,
    ): Promise<Prisma.ReviewGetPayload<T>> {
        try {
            return (await this.prisma.review.delete(params)) as Prisma.ReviewGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete review', error);
        }
    }

    async deleteMany(params: Prisma.ReviewDeleteManyArgs) {
        try {
            return await this.prisma.review.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete reviews', error);
        }
    }

    async count(params?: Prisma.ReviewCountArgs): Promise<number> {
        try {
            return await this.prisma.review.count(params);
        } catch (error) {
            throw new RepoError('Failed to count reviews', error);
        }
    }
}
