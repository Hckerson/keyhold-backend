import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class NewsletterSubscriberRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.NewsletterSubscriberFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.NewsletterSubscriberGetPayload<T> | null> {
        try {
            return (await this.prisma.newsletterSubscriber.findUnique(
                params,
            )) as Prisma.NewsletterSubscriberGetPayload<T> | null;
        } catch (error) {
            throw new RepoError(
                'Failed to find unique newsletter subscriber',
                error,
            );
        }
    }

    async findFirst<T extends Prisma.NewsletterSubscriberFindFirstArgs>(
        params: T,
    ): Promise<Prisma.NewsletterSubscriberGetPayload<T> | null> {
        try {
            return (await this.prisma.newsletterSubscriber.findFirst(
                params,
            )) as Prisma.NewsletterSubscriberGetPayload<T> | null;
        } catch (error) {
            throw new RepoError(
                'Failed to find first newsletter subscriber',
                error,
            );
        }
    }

    async findMany<T extends Prisma.NewsletterSubscriberFindManyArgs>(
        params: T,
    ): Promise<Prisma.NewsletterSubscriberGetPayload<T>[]> {
        try {
            return (await this.prisma.newsletterSubscriber.findMany(
                params,
            )) as Prisma.NewsletterSubscriberGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find newsletter subscribers', error);
        }
    }

    async create<T extends Prisma.NewsletterSubscriberCreateArgs>(
        params: T,
    ): Promise<Prisma.NewsletterSubscriberGetPayload<T>> {
        try {
            return (await this.prisma.newsletterSubscriber.create(
                params,
            )) as Prisma.NewsletterSubscriberGetPayload<T>;
        } catch (error) {
            throw new RepoError(
                'Failed to create newsletter subscriber',
                error,
            );
        }
    }

    async createMany(params: Prisma.NewsletterSubscriberCreateManyArgs) {
        try {
            return await this.prisma.newsletterSubscriber.createMany(params);
        } catch (error) {
            throw new RepoError(
                'Failed to create newsletter subscribers',
                error,
            );
        }
    }

    async update<T extends Prisma.NewsletterSubscriberUpdateArgs>(
        params: T,
    ): Promise<Prisma.NewsletterSubscriberGetPayload<T>> {
        try {
            return (await this.prisma.newsletterSubscriber.update(
                params,
            )) as Prisma.NewsletterSubscriberGetPayload<T>;
        } catch (error) {
            throw new RepoError(
                'Failed to update newsletter subscriber',
                error,
            );
        }
    }

    async updateMany(params: Prisma.NewsletterSubscriberUpdateManyArgs) {
        try {
            return await this.prisma.newsletterSubscriber.updateMany(params);
        } catch (error) {
            throw new RepoError(
                'Failed to update newsletter subscribers',
                error,
            );
        }
    }

    async delete<T extends Prisma.NewsletterSubscriberDeleteArgs>(
        params: T,
    ): Promise<Prisma.NewsletterSubscriberGetPayload<T>> {
        try {
            return (await this.prisma.newsletterSubscriber.delete(
                params,
            )) as Prisma.NewsletterSubscriberGetPayload<T>;
        } catch (error) {
            throw new RepoError(
                'Failed to delete newsletter subscriber',
                error,
            );
        }
    }

    async deleteMany(params: Prisma.NewsletterSubscriberDeleteManyArgs) {
        try {
            return await this.prisma.newsletterSubscriber.deleteMany(params);
        } catch (error) {
            throw new RepoError(
                'Failed to delete newsletter subscribers',
                error,
            );
        }
    }

    async count(
        params?: Prisma.NewsletterSubscriberCountArgs,
    ): Promise<number> {
        try {
            return await this.prisma.newsletterSubscriber.count(params);
        } catch (error) {
            throw new RepoError(
                'Failed to count newsletter subscribers',
                error,
            );
        }
    }
}
