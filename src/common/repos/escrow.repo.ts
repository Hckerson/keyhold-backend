import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class EscrowRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.EscrowFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.EscrowGetPayload<T> | null> {
        try {
            return (await this.prisma.escrow.findUnique(
                params,
            )) as Prisma.EscrowGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find unique escrow', error);
        }
    }

    async findFirst<T extends Prisma.EscrowFindFirstArgs>(
        params: T,
    ): Promise<Prisma.EscrowGetPayload<T> | null> {
        try {
            return (await this.prisma.escrow.findFirst(
                params,
            )) as Prisma.EscrowGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find first escrow', error);
        }
    }

    async findMany<T extends Prisma.EscrowFindManyArgs>(
        params: T,
    ): Promise<Prisma.EscrowGetPayload<T>[]> {
        try {
            return (await this.prisma.escrow.findMany(
                params,
            )) as Prisma.EscrowGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find escrows', error);
        }
    }

    async create<T extends Prisma.EscrowCreateArgs>(
        params: T,
    ): Promise<Prisma.EscrowGetPayload<T>> {
        try {
            return (await this.prisma.escrow.create(
                params,
            )) as Prisma.EscrowGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create escrow', error);
        }
    }

    async createMany(params: Prisma.EscrowCreateManyArgs) {
        try {
            return await this.prisma.escrow.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create escrows', error);
        }
    }

    async update<T extends Prisma.EscrowUpdateArgs>(
        params: T,
    ): Promise<Prisma.EscrowGetPayload<T>> {
        try {
            return (await this.prisma.escrow.update(
                params,
            )) as Prisma.EscrowGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update escrow', error);
        }
    }

    async updateMany(params: Prisma.EscrowUpdateManyArgs) {
        try {
            return await this.prisma.escrow.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update escrows', error);
        }
    }

    async delete<T extends Prisma.EscrowDeleteArgs>(
        params: T,
    ): Promise<Prisma.EscrowGetPayload<T>> {
        try {
            return (await this.prisma.escrow.delete(
                params,
            )) as Prisma.EscrowGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete escrow', error);
        }
    }

    async deleteMany(params: Prisma.EscrowDeleteManyArgs) {
        try {
            return await this.prisma.escrow.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete escrows', error);
        }
    }

    async count(params?: Prisma.EscrowCountArgs): Promise<number> {
        try {
            return await this.prisma.escrow.count(params);
        } catch (error) {
            throw new RepoError('Failed to count escrows', error);
        }
    }
}
