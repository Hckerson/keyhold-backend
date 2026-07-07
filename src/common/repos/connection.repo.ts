import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class ConnectionRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.ConnectionFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.ConnectionGetPayload<T> | null> {
        try {
            return (await this.prisma.connection.findUnique(params)) as Prisma.ConnectionGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find unique connection', error);
        }
    }

    async findFirst<T extends Prisma.ConnectionFindFirstArgs>(
        params: T,
    ): Promise<Prisma.ConnectionGetPayload<T> | null> {
        try {
            return (await this.prisma.connection.findFirst(params)) as Prisma.ConnectionGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find first connection', error);
        }
    }

    async findMany<T extends Prisma.ConnectionFindManyArgs>(
        params: T,
    ): Promise<Prisma.ConnectionGetPayload<T>[]> {
        try {
            return (await this.prisma.connection.findMany(params)) as Prisma.ConnectionGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find connections', error);
        }
    }

    async create<T extends Prisma.ConnectionCreateArgs>(
        params: T,
    ): Promise<Prisma.ConnectionGetPayload<T>> {
        try {
            return (await this.prisma.connection.create(params)) as Prisma.ConnectionGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create connection', error);
        }
    }

    async createMany(params: Prisma.ConnectionCreateManyArgs) {
        try {
            return await this.prisma.connection.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create connections', error);
        }
    }

    async update<T extends Prisma.ConnectionUpdateArgs>(
        params: T,
    ): Promise<Prisma.ConnectionGetPayload<T>> {
        try {
            return (await this.prisma.connection.update(params)) as Prisma.ConnectionGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update connection', error);
        }
    }

    async updateMany(params: Prisma.ConnectionUpdateManyArgs) {
        try {
            return await this.prisma.connection.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update connections', error);
        }
    }

    async delete<T extends Prisma.ConnectionDeleteArgs>(
        params: T,
    ): Promise<Prisma.ConnectionGetPayload<T>> {
        try {
            return (await this.prisma.connection.delete(params)) as Prisma.ConnectionGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete connection', error);
        }
    }

    async deleteMany(params: Prisma.ConnectionDeleteManyArgs) {
        try {
            return await this.prisma.connection.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete connections', error);
        }
    }

    async count(params?: Prisma.ConnectionCountArgs): Promise<number> {
        try {
            return await this.prisma.connection.count(params);
        } catch (error) {
            throw new RepoError('Failed to count connections', error);
        }
    }
}
