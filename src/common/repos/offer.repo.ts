import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class OfferRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.OfferFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.OfferGetPayload<T> | null> {
        try {
            return (await this.prisma.tx.offer.findUnique(
                params,
            )) as Prisma.OfferGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find unique offer', error);
        }
    }

    async findFirst<T extends Prisma.OfferFindFirstArgs>(
        params: T,
    ): Promise<Prisma.OfferGetPayload<T> | null> {
        try {
            return (await this.prisma.tx.offer.findFirst(
                params,
            )) as Prisma.OfferGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find first offer', error);
        }
    }

    async findMany<T extends Prisma.OfferFindManyArgs>(
        params: T,
    ): Promise<Prisma.OfferGetPayload<T>[]> {
        try {
            return (await this.prisma.tx.offer.findMany(
                params,
            )) as Prisma.OfferGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find offers', error);
        }
    }

    async create<T extends Prisma.OfferCreateArgs>(
        params: T,
    ): Promise<Prisma.OfferGetPayload<T>> {
        try {
            return (await this.prisma.tx.offer.create(
                params,
            )) as Prisma.OfferGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create offer', error);
        }
    }

    async createMany(params: Prisma.OfferCreateManyArgs) {
        try {
            return await this.prisma.tx.offer.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create offers', error);
        }
    }

    async update<T extends Prisma.OfferUpdateArgs>(
        params: T,
    ): Promise<Prisma.OfferGetPayload<T>> {
        try {
            return (await this.prisma.tx.offer.update(
                params,
            )) as Prisma.OfferGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update offer', error);
        }
    }

    async updateMany(params: Prisma.OfferUpdateManyArgs) {
        try {
            return await this.prisma.tx.offer.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update offers', error);
        }
    }

    async delete<T extends Prisma.OfferDeleteArgs>(
        params: T,
    ): Promise<Prisma.OfferGetPayload<T>> {
        try {
            return (await this.prisma.tx.offer.delete(
                params,
            )) as Prisma.OfferGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete offer', error);
        }
    }

    async deleteMany(params: Prisma.OfferDeleteManyArgs) {
        try {
            return await this.prisma.tx.offer.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete offers', error);
        }
    }

    async count(params?: Prisma.OfferCountArgs): Promise<number> {
        try {
            return await this.prisma.tx.offer.count(params);
        } catch (error) {
            throw new RepoError('Failed to count offers', error);
        }
    }
}
