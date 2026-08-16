import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class PhoneVerificationRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.PhoneVerificationFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.PhoneVerificationGetPayload<T> | null> {
        try {
            return (await this.prisma.phoneVerification.findUnique(
                params,
            )) as Prisma.PhoneVerificationGetPayload<T> | null;
        } catch (error) {
            throw new RepoError(
                'Failed to find unique phone verification',
                error,
            );
        }
    }

    async findFirst<T extends Prisma.PhoneVerificationFindFirstArgs>(
        params: T,
    ): Promise<Prisma.PhoneVerificationGetPayload<T> | null> {
        try {
            return (await this.prisma.phoneVerification.findFirst(
                params,
            )) as Prisma.PhoneVerificationGetPayload<T> | null;
        } catch (error) {
            throw new RepoError(
                'Failed to find first phone verification',
                error,
            );
        }
    }

    async findMany<T extends Prisma.PhoneVerificationFindManyArgs>(
        params: T,
    ): Promise<Prisma.PhoneVerificationGetPayload<T>[]> {
        try {
            return (await this.prisma.phoneVerification.findMany(
                params,
            )) as Prisma.PhoneVerificationGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find phone verifications', error);
        }
    }

    async create<T extends Prisma.PhoneVerificationCreateArgs>(
        params: T,
    ): Promise<Prisma.PhoneVerificationGetPayload<T>> {
        try {
            return (await this.prisma.phoneVerification.create(
                params,
            )) as Prisma.PhoneVerificationGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create phone verification', error);
        }
    }

    async createMany(params: Prisma.PhoneVerificationCreateManyArgs) {
        try {
            return await this.prisma.phoneVerification.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create phone verifications', error);
        }
    }

    async update<T extends Prisma.PhoneVerificationUpdateArgs>(
        params: T,
    ): Promise<Prisma.PhoneVerificationGetPayload<T>> {
        try {
            return (await this.prisma.phoneVerification.update(
                params,
            )) as Prisma.PhoneVerificationGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update phone verification', error);
        }
    }

    async updateMany(params: Prisma.PhoneVerificationUpdateManyArgs) {
        try {
            return await this.prisma.phoneVerification.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update phone verifications', error);
        }
    }

    async delete<T extends Prisma.PhoneVerificationDeleteArgs>(
        params: T,
    ): Promise<Prisma.PhoneVerificationGetPayload<T>> {
        try {
            return (await this.prisma.phoneVerification.delete(
                params,
            )) as Prisma.PhoneVerificationGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete phone verification', error);
        }
    }

    async deleteMany(params: Prisma.PhoneVerificationDeleteManyArgs) {
        try {
            return await this.prisma.phoneVerification.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete phone verifications', error);
        }
    }

    async count(params?: Prisma.PhoneVerificationCountArgs): Promise<number> {
        try {
            return await this.prisma.phoneVerification.count(params);
        } catch (error) {
            throw new RepoError('Failed to count phone verifications', error);
        }
    }
}
