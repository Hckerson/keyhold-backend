import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class IdempotencyRecordRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.IdempotencyRecordFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.IdempotencyRecordGetPayload<T> | null> {
        try {
            return (await this.prisma.tx.idempotencyRecord.findUnique(
                params,
            )) as Prisma.IdempotencyRecordGetPayload<T> | null;
        } catch (error) {
            throw new RepoError(
                'Failed to find unique idempotency record',
                error,
            );
        }
    }

    async findFirst<T extends Prisma.IdempotencyRecordFindFirstArgs>(
        params: T,
    ): Promise<Prisma.IdempotencyRecordGetPayload<T> | null> {
        try {
            return (await this.prisma.tx.idempotencyRecord.findFirst(
                params,
            )) as Prisma.IdempotencyRecordGetPayload<T> | null;
        } catch (error) {
            throw new RepoError(
                'Failed to find first idempotency record',
                error,
            );
        }
    }

    async findMany<T extends Prisma.IdempotencyRecordFindManyArgs>(
        params: T,
    ): Promise<Prisma.IdempotencyRecordGetPayload<T>[]> {
        try {
            return (await this.prisma.tx.idempotencyRecord.findMany(
                params,
            )) as Prisma.IdempotencyRecordGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find idempotency records', error);
        }
    }

    async create<T extends Prisma.IdempotencyRecordCreateArgs>(
        params: T,
    ): Promise<Prisma.IdempotencyRecordGetPayload<T>> {
        try {
            return (await this.prisma.tx.idempotencyRecord.create(
                params,
            )) as Prisma.IdempotencyRecordGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create idempotency record', error);
        }
    }

    async createMany(params: Prisma.IdempotencyRecordCreateManyArgs) {
        try {
            return await this.prisma.tx.idempotencyRecord.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create idempotency records', error);
        }
    }

    async update<T extends Prisma.IdempotencyRecordUpdateArgs>(
        params: T,
    ): Promise<Prisma.IdempotencyRecordGetPayload<T>> {
        try {
            return (await this.prisma.tx.idempotencyRecord.update(
                params,
            )) as Prisma.IdempotencyRecordGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update idempotency record', error);
        }
    }

    async updateMany(params: Prisma.IdempotencyRecordUpdateManyArgs) {
        try {
            return await this.prisma.tx.idempotencyRecord.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update idempotency records', error);
        }
    }

    async delete<T extends Prisma.IdempotencyRecordDeleteArgs>(
        params: T,
    ): Promise<Prisma.IdempotencyRecordGetPayload<T>> {
        try {
            return (await this.prisma.tx.idempotencyRecord.delete(
                params,
            )) as Prisma.IdempotencyRecordGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete idempotency record', error);
        }
    }

    async deleteMany(params: Prisma.IdempotencyRecordDeleteManyArgs) {
        try {
            return await this.prisma.tx.idempotencyRecord.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete idempotency records', error);
        }
    }

    async count(params?: Prisma.IdempotencyRecordCountArgs): Promise<number> {
        try {
            return await this.prisma.tx.idempotencyRecord.count(params);
        } catch (error) {
            throw new RepoError('Failed to count idempotency records', error);
        }
    }

    async aggregate<T extends Prisma.IdempotencyRecordAggregateArgs>(
        params: T,
    ): Promise<Prisma.GetIdempotencyRecordAggregateType<T>> {
        try {
            return await this.prisma.tx.idempotencyRecord.aggregate(params);
        } catch (error) {
            throw new RepoError(
                'Failed to aggregate idempotency records',
                error,
            );
        }
    }
}
