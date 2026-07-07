import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class DisputeEvidenceRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.DisputeEvidenceFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.DisputeEvidenceGetPayload<T> | null> {
        try {
            return (await this.prisma.disputeEvidence.findUnique(params)) as Prisma.DisputeEvidenceGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find unique dispute evidence', error);
        }
    }

    async findFirst<T extends Prisma.DisputeEvidenceFindFirstArgs>(
        params: T,
    ): Promise<Prisma.DisputeEvidenceGetPayload<T> | null> {
        try {
            return (await this.prisma.disputeEvidence.findFirst(params)) as Prisma.DisputeEvidenceGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find first dispute evidence', error);
        }
    }

    async findMany<T extends Prisma.DisputeEvidenceFindManyArgs>(
        params: T,
    ): Promise<Prisma.DisputeEvidenceGetPayload<T>[]> {
        try {
            return (await this.prisma.disputeEvidence.findMany(params)) as Prisma.DisputeEvidenceGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find dispute evidences', error);
        }
    }

    async create<T extends Prisma.DisputeEvidenceCreateArgs>(
        params: T,
    ): Promise<Prisma.DisputeEvidenceGetPayload<T>> {
        try {
            return (await this.prisma.disputeEvidence.create(params)) as Prisma.DisputeEvidenceGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create dispute evidence', error);
        }
    }

    async createMany(params: Prisma.DisputeEvidenceCreateManyArgs) {
        try {
            return await this.prisma.disputeEvidence.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create dispute evidences', error);
        }
    }

    async update<T extends Prisma.DisputeEvidenceUpdateArgs>(
        params: T,
    ): Promise<Prisma.DisputeEvidenceGetPayload<T>> {
        try {
            return (await this.prisma.disputeEvidence.update(params)) as Prisma.DisputeEvidenceGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update dispute evidence', error);
        }
    }

    async updateMany(params: Prisma.DisputeEvidenceUpdateManyArgs) {
        try {
            return await this.prisma.disputeEvidence.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update dispute evidences', error);
        }
    }

    async delete<T extends Prisma.DisputeEvidenceDeleteArgs>(
        params: T,
    ): Promise<Prisma.DisputeEvidenceGetPayload<T>> {
        try {
            return (await this.prisma.disputeEvidence.delete(params)) as Prisma.DisputeEvidenceGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete dispute evidence', error);
        }
    }

    async deleteMany(params: Prisma.DisputeEvidenceDeleteManyArgs) {
        try {
            return await this.prisma.disputeEvidence.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete dispute evidences', error);
        }
    }

    async count(params?: Prisma.DisputeEvidenceCountArgs): Promise<number> {
        try {
            return await this.prisma.disputeEvidence.count(params);
        } catch (error) {
            throw new RepoError('Failed to count dispute evidences', error);
        }
    }
}
