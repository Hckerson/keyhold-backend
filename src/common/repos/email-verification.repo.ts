import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class EmailVerificationRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.EmailVerificationFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.EmailVerificationGetPayload<T> | null> {
        try {
            return (await this.prisma.emailVerification.findUnique(params));
        } catch (error) {
            throw new RepoError('Failed to find unique email verification', error);
        }
    }

    async findFirst<T extends Prisma.EmailVerificationFindFirstArgs>(
        params: T,
    ): Promise<Prisma.EmailVerificationGetPayload<T> | null> {
        try {
            return (await this.prisma.emailVerification.findFirst(params));
        } catch (error) {
            throw new RepoError('Failed to find first email verification', error);
        }
    }

    async findMany<T extends Prisma.EmailVerificationFindManyArgs>(
        params: T,
    ): Promise<Prisma.EmailVerificationGetPayload<T>[]> {
        try {
            return (await this.prisma.emailVerification.findMany(params)) as Prisma.EmailVerificationGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find email verifications', error);
        }
    }

    async create<T extends Prisma.EmailVerificationCreateArgs>(
        params: T,
    ): Promise<Prisma.EmailVerificationGetPayload<T>> {
        try {
            return (await this.prisma.emailVerification.create(params)) as Prisma.EmailVerificationGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create email verification', error);
        }
    }

    async createMany(params: Prisma.EmailVerificationCreateManyArgs) {
        try {
            return await this.prisma.emailVerification.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create email verifications', error);
        }
    }

    async update<T extends Prisma.EmailVerificationUpdateArgs>(
        params: T,
    ): Promise<Prisma.EmailVerificationGetPayload<T>> {
        try {
            return (await this.prisma.emailVerification.update(params)) as Prisma.EmailVerificationGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update email verification', error);
        }
    }

    async updateMany(params: Prisma.EmailVerificationUpdateManyArgs) {
        try {
            return await this.prisma.emailVerification.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update email verifications', error);
        }
    }

    async delete<T extends Prisma.EmailVerificationDeleteArgs>(
        params: T,
    ): Promise<Prisma.EmailVerificationGetPayload<T>> {
        try {
            return (await this.prisma.emailVerification.delete(params)) as Prisma.EmailVerificationGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete email verification', error);
        }
    }

    async deleteMany(params: Prisma.EmailVerificationDeleteManyArgs) {
        try {
            return await this.prisma.emailVerification.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete email verifications', error);
        }
    }

    async count(params?: Prisma.EmailVerificationCountArgs): Promise<number> {
        try {
            return await this.prisma.emailVerification.count(params);
        } catch (error) {
            throw new RepoError('Failed to count email verifications', error);
        }
    }
}
