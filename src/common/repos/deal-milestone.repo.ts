import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class DealMilestoneRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.DealMilestoneFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.DealMilestoneGetPayload<T> | null> {
        try {
            return (await this.prisma.dealMilestone.findUnique(
                params,
            )) as Prisma.DealMilestoneGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find unique deal milestone', error);
        }
    }

    async findMany<T extends Prisma.DealMilestoneFindManyArgs>(
        params: T,
    ): Promise<Prisma.DealMilestoneGetPayload<T>[]> {
        try {
            return (await this.prisma.dealMilestone.findMany(
                params,
            )) as Prisma.DealMilestoneGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find deal milestones', error);
        }
    }

    async createMany(params: Prisma.DealMilestoneCreateManyArgs) {
        try {
            return await this.prisma.dealMilestone.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create deal milestones', error);
        }
    }

    async update<T extends Prisma.DealMilestoneUpdateArgs>(
        params: T,
    ): Promise<Prisma.DealMilestoneGetPayload<T>> {
        try {
            return (await this.prisma.dealMilestone.update(
                params,
            )) as Prisma.DealMilestoneGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update deal milestone', error);
        }
    }
}
