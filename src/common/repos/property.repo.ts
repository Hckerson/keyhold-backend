import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class PropertyRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.PropertyFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.PropertyGetPayload<T> | null> {
        try {
            return (await this.prisma.property.findUnique(params)) as Prisma.PropertyGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find unique property', error);
        }
    }

    async findFirst<T extends Prisma.PropertyFindFirstArgs>(
        params: T,
    ): Promise<Prisma.PropertyGetPayload<T> | null> {
        try {
            return (await this.prisma.property.findFirst(params)) as Prisma.PropertyGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find first property', error);
        }
    }

    async findMany<T extends Prisma.PropertyFindManyArgs>(
        params: T,
    ): Promise<Prisma.PropertyGetPayload<T>[]> {
        try {
            return (await this.prisma.property.findMany(params)) as Prisma.PropertyGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find properties', error);
        }
    }

    async create<T extends Prisma.PropertyCreateArgs>(
        params: T,
    ): Promise<Prisma.PropertyGetPayload<T>> {
        try {
            return (await this.prisma.property.create(params)) as Prisma.PropertyGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create property', error);
        }
    }

    async createMany(params: Prisma.PropertyCreateManyArgs) {
        try {
            return await this.prisma.property.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create properties', error);
        }
    }

    async update<T extends Prisma.PropertyUpdateArgs>(
        params: T,
    ): Promise<Prisma.PropertyGetPayload<T>> {
        try {
            return (await this.prisma.property.update(params)) as Prisma.PropertyGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update property', error);
        }
    }

    async updateMany(params: Prisma.PropertyUpdateManyArgs) {
        try {
            return await this.prisma.property.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update properties', error);
        }
    }

    async delete<T extends Prisma.PropertyDeleteArgs>(
        params: T,
    ): Promise<Prisma.PropertyGetPayload<T>> {
        try {
            return (await this.prisma.property.delete(params)) as Prisma.PropertyGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete property', error);
        }
    }

    async deleteMany(params: Prisma.PropertyDeleteManyArgs) {
        try {
            return await this.prisma.property.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete properties', error);
        }
    }

    async count(params?: Prisma.PropertyCountArgs): Promise<number> {
        try {
            return await this.prisma.property.count(params);
        } catch (error) {
            throw new RepoError('Failed to count properties', error);
        }
    }
}
