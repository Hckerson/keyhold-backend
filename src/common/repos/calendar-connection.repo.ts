import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class CalendarConnectionRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.CalendarConnectionFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.CalendarConnectionGetPayload<T> | null> {
        try {
            return (await this.prisma.calendarConnection.findUnique(
                params,
            )) as Prisma.CalendarConnectionGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find calendar connection', error);
        }
    }

    async upsert<T extends Prisma.CalendarConnectionUpsertArgs>(
        params: T,
    ): Promise<Prisma.CalendarConnectionGetPayload<T>> {
        try {
            return (await this.prisma.calendarConnection.upsert(
                params,
            )) as Prisma.CalendarConnectionGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to upsert calendar connection', error);
        }
    }

    async updateMany(params: Prisma.CalendarConnectionUpdateManyArgs) {
        try {
            return await this.prisma.calendarConnection.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update calendar connections', error);
        }
    }

    async deleteMany(params: Prisma.CalendarConnectionDeleteManyArgs) {
        try {
            return await this.prisma.calendarConnection.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete calendar connections', error);
        }
    }
}
