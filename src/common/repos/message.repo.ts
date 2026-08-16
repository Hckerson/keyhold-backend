import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class MessageRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.MessageFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.MessageGetPayload<T> | null> {
        try {
            return (await this.prisma.message.findUnique(
                params,
            )) as Prisma.MessageGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find unique message', error);
        }
    }

    async findFirst<T extends Prisma.MessageFindFirstArgs>(
        params: T,
    ): Promise<Prisma.MessageGetPayload<T> | null> {
        try {
            return (await this.prisma.message.findFirst(
                params,
            )) as Prisma.MessageGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find first message', error);
        }
    }

    async findMany<T extends Prisma.MessageFindManyArgs>(
        params: T,
    ): Promise<Prisma.MessageGetPayload<T>[]> {
        try {
            return (await this.prisma.message.findMany(
                params,
            )) as Prisma.MessageGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find messages', error);
        }
    }

    async create<T extends Prisma.MessageCreateArgs>(
        params: T,
    ): Promise<Prisma.MessageGetPayload<T>> {
        try {
            return (await this.prisma.message.create(
                params,
            )) as Prisma.MessageGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create message', error);
        }
    }

    async createMany(params: Prisma.MessageCreateManyArgs) {
        try {
            return await this.prisma.message.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create messages', error);
        }
    }

    async update<T extends Prisma.MessageUpdateArgs>(
        params: T,
    ): Promise<Prisma.MessageGetPayload<T>> {
        try {
            return (await this.prisma.message.update(
                params,
            )) as Prisma.MessageGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update message', error);
        }
    }

    async updateMany(params: Prisma.MessageUpdateManyArgs) {
        try {
            return await this.prisma.message.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update messages', error);
        }
    }

    async delete<T extends Prisma.MessageDeleteArgs>(
        params: T,
    ): Promise<Prisma.MessageGetPayload<T>> {
        try {
            return (await this.prisma.message.delete(
                params,
            )) as Prisma.MessageGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete message', error);
        }
    }

    async deleteMany(params: Prisma.MessageDeleteManyArgs) {
        try {
            return await this.prisma.message.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete messages', error);
        }
    }

    async count(params?: Prisma.MessageCountArgs): Promise<number> {
        try {
            return await this.prisma.message.count(params);
        } catch (error) {
            throw new RepoError('Failed to count messages', error);
        }
    }
}
