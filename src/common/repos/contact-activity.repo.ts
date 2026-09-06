import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class ContactActivityRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.ContactActivityFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.ContactActivityGetPayload<T> | null> {
        try {
            return (await this.prisma.contactActivity.findUnique(
                params,
            )) as Prisma.ContactActivityGetPayload<T> | null;
        } catch (error) {
            throw new RepoError(
                'Failed to find unique contact activity',
                error,
            );
        }
    }

    async findFirst<T extends Prisma.ContactActivityFindFirstArgs>(
        params: T,
    ): Promise<Prisma.ContactActivityGetPayload<T> | null> {
        try {
            return (await this.prisma.contactActivity.findFirst(
                params,
            )) as Prisma.ContactActivityGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find first contact activity', error);
        }
    }

    async findMany<T extends Prisma.ContactActivityFindManyArgs>(
        params: T,
    ): Promise<Prisma.ContactActivityGetPayload<T>[]> {
        try {
            return (await this.prisma.contactActivity.findMany(
                params,
            )) as Prisma.ContactActivityGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find contact activities', error);
        }
    }

    async create<T extends Prisma.ContactActivityCreateArgs>(
        params: T,
    ): Promise<Prisma.ContactActivityGetPayload<T>> {
        try {
            return (await this.prisma.contactActivity.create(
                params,
            )) as Prisma.ContactActivityGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create contact activity', error);
        }
    }

    async update<T extends Prisma.ContactActivityUpdateArgs>(
        params: T,
    ): Promise<Prisma.ContactActivityGetPayload<T>> {
        try {
            return (await this.prisma.contactActivity.update(
                params,
            )) as Prisma.ContactActivityGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update contact activity', error);
        }
    }

    async updateMany(params: Prisma.ContactActivityUpdateManyArgs) {
        try {
            return await this.prisma.contactActivity.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update contact activities', error);
        }
    }

    async deleteMany(params: Prisma.ContactActivityDeleteManyArgs) {
        try {
            return await this.prisma.contactActivity.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete contact activities', error);
        }
    }

    async count(params?: Prisma.ContactActivityCountArgs): Promise<number> {
        try {
            return await this.prisma.contactActivity.count(params);
        } catch (error) {
            throw new RepoError('Failed to count contact activities', error);
        }
    }
}
