import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class KycDocumentRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.KycDocumentFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.KycDocumentGetPayload<T> | null> {
        try {
            return (await this.prisma.kycDocument.findUnique(params));
        } catch (error) {
            throw new RepoError('Failed to find unique kyc document', error);
        }
    }

    async findFirst<T extends Prisma.KycDocumentFindFirstArgs>(
        params: T,
    ): Promise<Prisma.KycDocumentGetPayload<T> | null> {
        try {
            return (await this.prisma.kycDocument.findFirst(params));
        } catch (error) {
            throw new RepoError('Failed to find first kyc document', error);
        }
    }

    async findMany<T extends Prisma.KycDocumentFindManyArgs>(
        params: T,
    ): Promise<Prisma.KycDocumentGetPayload<T>[]> {
        try {
            return (await this.prisma.kycDocument.findMany(params)) as Prisma.KycDocumentGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find kyc documents', error);
        }
    }

    async create<T extends Prisma.KycDocumentCreateArgs>(
        params: T,
    ): Promise<Prisma.KycDocumentGetPayload<T>> {
        try {
            return (await this.prisma.kycDocument.create(params)) as Prisma.KycDocumentGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create kyc document', error);
        }
    }

    async createMany(params: Prisma.KycDocumentCreateManyArgs) {
        try {
            return await this.prisma.kycDocument.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create kyc documents', error);
        }
    }

    async update<T extends Prisma.KycDocumentUpdateArgs>(
        params: T,
    ): Promise<Prisma.KycDocumentGetPayload<T>> {
        try {
            return (await this.prisma.kycDocument.update(params)) as Prisma.KycDocumentGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update kyc document', error);
        }
    }

    async updateMany(params: Prisma.KycDocumentUpdateManyArgs) {
        try {
            return await this.prisma.kycDocument.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update kyc documents', error);
        }
    }

    async delete<T extends Prisma.KycDocumentDeleteArgs>(
        params: T,
    ): Promise<Prisma.KycDocumentGetPayload<T>> {
        try {
            return (await this.prisma.kycDocument.delete(params)) as Prisma.KycDocumentGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete kyc document', error);
        }
    }

    async deleteMany(params: Prisma.KycDocumentDeleteManyArgs) {
        try {
            return await this.prisma.kycDocument.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete kyc documents', error);
        }
    }

    async count(params?: Prisma.KycDocumentCountArgs): Promise<number> {
        try {
            return await this.prisma.kycDocument.count(params);
        } catch (error) {
            throw new RepoError('Failed to count kyc documents', error);
        }
    }
}
