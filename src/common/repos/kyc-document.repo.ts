import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class IdentityDocumentRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.IdentityDocumentFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.IdentityDocumentGetPayload<T> | null> {
        try {
            return (await this.prisma.identityDocument.findUnique(params)) as Prisma.IdentityDocumentGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find unique identity document', error);
        }
    }

    async findFirst<T extends Prisma.IdentityDocumentFindFirstArgs>(
        params: T,
    ): Promise<Prisma.IdentityDocumentGetPayload<T> | null> {
        try {
            return (await this.prisma.identityDocument.findFirst(params)) as Prisma.IdentityDocumentGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find first identity document', error);
        }
    }

    async findMany<T extends Prisma.IdentityDocumentFindManyArgs>(
        params: T,
    ): Promise<Prisma.IdentityDocumentGetPayload<T>[]> {
        try {
            return (await this.prisma.identityDocument.findMany(params)) as Prisma.IdentityDocumentGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find identity documents', error);
        }
    }

    async create<T extends Prisma.IdentityDocumentCreateArgs>(
        params: T,
    ): Promise<Prisma.IdentityDocumentGetPayload<T>> {
        try {
            return (await this.prisma.identityDocument.create(params)) as Prisma.IdentityDocumentGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create identity document', error);
        }
    }

    async createMany(params: Prisma.IdentityDocumentCreateManyArgs) {
        try {
            return await this.prisma.identityDocument.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create identity documents', error);
        }
    }

    async update<T extends Prisma.IdentityDocumentUpdateArgs>(
        params: T,
    ): Promise<Prisma.IdentityDocumentGetPayload<T>> {
        try {
            return (await this.prisma.identityDocument.update(params)) as Prisma.IdentityDocumentGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update identity document', error);
        }
    }

    async updateMany(params: Prisma.IdentityDocumentUpdateManyArgs) {
        try {
            return await this.prisma.identityDocument.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update identity documents', error);
        }
    }

    async delete<T extends Prisma.IdentityDocumentDeleteArgs>(
        params: T,
    ): Promise<Prisma.IdentityDocumentGetPayload<T>> {
        try {
            return (await this.prisma.identityDocument.delete(params)) as Prisma.IdentityDocumentGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete identity document', error);
        }
    }

    async deleteMany(params: Prisma.IdentityDocumentDeleteManyArgs) {
        try {
            return await this.prisma.identityDocument.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete identity documents', error);
        }
    }

    async count(params?: Prisma.IdentityDocumentCountArgs): Promise<number> {
        try {
            return await this.prisma.identityDocument.count(params);
        } catch (error) {
            throw new RepoError('Failed to count identity documents', error);
        }
    }
}
