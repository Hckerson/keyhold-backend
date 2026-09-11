import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class AuthIdentityRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.AuthIdentityFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.AuthIdentityGetPayload<T> | null> {
        try {
            return (await this.prisma.authIdentity.findUnique(
                params,
            )) as Prisma.AuthIdentityGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find auth identity', error);
        }
    }

    async create<T extends Prisma.AuthIdentityCreateArgs>(
        params: T,
    ): Promise<Prisma.AuthIdentityGetPayload<T>> {
        try {
            return (await this.prisma.authIdentity.create(
                params,
            )) as Prisma.AuthIdentityGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create auth identity', error);
        }
    }
}
