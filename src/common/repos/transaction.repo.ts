import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class TransactionRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.TransactionFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.TransactionGetPayload<T> | null> {
        try {
            return (await this.prisma.tx.transaction.findUnique(
                params,
            )) as Prisma.TransactionGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find unique transaction', error);
        }
    }

    async findFirst<T extends Prisma.TransactionFindFirstArgs>(
        params: T,
    ): Promise<Prisma.TransactionGetPayload<T> | null> {
        try {
            return (await this.prisma.tx.transaction.findFirst(
                params,
            )) as Prisma.TransactionGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find first transaction', error);
        }
    }

    async findMany<T extends Prisma.TransactionFindManyArgs>(
        params: T,
    ): Promise<Prisma.TransactionGetPayload<T>[]> {
        try {
            return (await this.prisma.tx.transaction.findMany(
                params,
            )) as Prisma.TransactionGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find transactions', error);
        }
    }

    async create<T extends Prisma.TransactionCreateArgs>(
        params: T,
    ): Promise<Prisma.TransactionGetPayload<T>> {
        try {
            return (await this.prisma.tx.transaction.create(
                params,
            )) as Prisma.TransactionGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create transaction', error);
        }
    }

    async createMany(params: Prisma.TransactionCreateManyArgs) {
        try {
            return await this.prisma.tx.transaction.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create transactions', error);
        }
    }

    async update<T extends Prisma.TransactionUpdateArgs>(
        params: T,
    ): Promise<Prisma.TransactionGetPayload<T>> {
        try {
            return (await this.prisma.tx.transaction.update(
                params,
            )) as Prisma.TransactionGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update transaction', error);
        }
    }

    async updateMany(params: Prisma.TransactionUpdateManyArgs) {
        try {
            return await this.prisma.tx.transaction.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update transactions', error);
        }
    }

    async delete<T extends Prisma.TransactionDeleteArgs>(
        params: T,
    ): Promise<Prisma.TransactionGetPayload<T>> {
        try {
            return (await this.prisma.tx.transaction.delete(
                params,
            )) as Prisma.TransactionGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete transaction', error);
        }
    }

    async deleteMany(params: Prisma.TransactionDeleteManyArgs) {
        try {
            return await this.prisma.tx.transaction.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete transactions', error);
        }
    }

    async groupBy(
        params: Omit<Prisma.TransactionGroupByArgs, 'skip' | 'take'>,
    ) {
        try {
            return await this.prisma.tx.transaction.groupBy(params);
        } catch (error) {
            throw new RepoError('Failed to group transactions', error);
        }
    }

    async count(params?: Prisma.TransactionCountArgs): Promise<number> {
        try {
            return await this.prisma.tx.transaction.count(params);
        } catch (error) {
            throw new RepoError('Failed to count transactions', error);
        }
    }
}
