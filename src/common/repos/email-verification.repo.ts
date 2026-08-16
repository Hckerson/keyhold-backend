import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class EmailVerificationRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.VerificationTokenFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.VerificationTokenGetPayload<T> | null> {
        try {
            return (await this.prisma.verificationToken.findUnique(
                params,
            )) as Prisma.VerificationTokenGetPayload<T> | null;
        } catch (error) {
            throw new RepoError(
                'Failed to find unique email verification',
                error,
            );
        }
    }

    async findFirst<T extends Prisma.VerificationTokenFindFirstArgs>(
        params: T,
    ): Promise<Prisma.VerificationTokenGetPayload<T> | null> {
        try {
            return (await this.prisma.verificationToken.findFirst(
                params,
            )) as Prisma.VerificationTokenGetPayload<T> | null;
        } catch (error) {
            throw new RepoError(
                'Failed to find first email verification',
                error,
            );
        }
    }

    async findMany<T extends Prisma.VerificationTokenFindManyArgs>(
        params: T,
    ): Promise<Prisma.VerificationTokenGetPayload<T>[]> {
        try {
            return (await this.prisma.verificationToken.findMany(
                params,
            )) as Prisma.VerificationTokenGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find email verifications', error);
        }
    }

    async create<T extends Prisma.VerificationTokenCreateArgs>(
        params: T,
    ): Promise<Prisma.VerificationTokenGetPayload<T>> {
        try {
            return (await this.prisma.verificationToken.create(
                params,
            )) as Prisma.VerificationTokenGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create email verification', error);
        }
    }

    async createMany(params: Prisma.VerificationTokenCreateManyArgs) {
        try {
            return await this.prisma.verificationToken.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create email verifications', error);
        }
    }

    async update<T extends Prisma.VerificationTokenUpdateArgs>(
        params: T,
    ): Promise<Prisma.VerificationTokenGetPayload<T>> {
        try {
            return (await this.prisma.verificationToken.update(
                params,
            )) as Prisma.VerificationTokenGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update email verification', error);
        }
    }

    async updateMany(params: Prisma.VerificationTokenUpdateManyArgs) {
        try {
            return await this.prisma.verificationToken.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update email verifications', error);
        }
    }

    async delete<T extends Prisma.VerificationTokenDeleteArgs>(
        params: T,
    ): Promise<Prisma.VerificationTokenGetPayload<T>> {
        try {
            return (await this.prisma.verificationToken.delete(
                params,
            )) as Prisma.VerificationTokenGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete email verification', error);
        }
    }

    async deleteMany(params: Prisma.VerificationTokenDeleteManyArgs) {
        try {
            return await this.prisma.verificationToken.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete email verifications', error);
        }
    }

    async count(params?: Prisma.VerificationTokenCountArgs): Promise<number> {
        try {
            return await this.prisma.verificationToken.count(params);
        } catch (error) {
            throw new RepoError('Failed to count email verifications', error);
        }
    }
}
