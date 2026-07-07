import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class AuditLogRepo {
    constructor(private prisma: PrismaService) {}

    async findUnique<T extends Prisma.AuditLogFindUniqueArgs>(
        params: T,
    ): Promise<Prisma.AuditLogGetPayload<T> | null> {
        try {
            return (await this.prisma.auditLog.findUnique(params)) as Prisma.AuditLogGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find unique audit log', error);
        }
    }

    async findFirst<T extends Prisma.AuditLogFindFirstArgs>(
        params: T,
    ): Promise<Prisma.AuditLogGetPayload<T> | null> {
        try {
            return (await this.prisma.auditLog.findFirst(params)) as Prisma.AuditLogGetPayload<T> | null;
        } catch (error) {
            throw new RepoError('Failed to find first audit log', error);
        }
    }

    async findMany<T extends Prisma.AuditLogFindManyArgs>(
        params: T,
    ): Promise<Prisma.AuditLogGetPayload<T>[]> {
        try {
            return (await this.prisma.auditLog.findMany(params)) as Prisma.AuditLogGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find audit logs', error);
        }
    }

    async create<T extends Prisma.AuditLogCreateArgs>(
        params: T,
    ): Promise<Prisma.AuditLogGetPayload<T>> {
        try {
            return (await this.prisma.auditLog.create(params)) as Prisma.AuditLogGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to create audit log', error);
        }
    }

    async createMany(params: Prisma.AuditLogCreateManyArgs) {
        try {
            return await this.prisma.auditLog.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create audit logs', error);
        }
    }

    async update<T extends Prisma.AuditLogUpdateArgs>(
        params: T,
    ): Promise<Prisma.AuditLogGetPayload<T>> {
        try {
            return (await this.prisma.auditLog.update(params)) as Prisma.AuditLogGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to update audit log', error);
        }
    }

    async updateMany(params: Prisma.AuditLogUpdateManyArgs) {
        try {
            return await this.prisma.auditLog.updateMany(params);
        } catch (error) {
            throw new RepoError('Failed to update audit logs', error);
        }
    }

    async delete<T extends Prisma.AuditLogDeleteArgs>(
        params: T,
    ): Promise<Prisma.AuditLogGetPayload<T>> {
        try {
            return (await this.prisma.auditLog.delete(params)) as Prisma.AuditLogGetPayload<T>;
        } catch (error) {
            throw new RepoError('Failed to delete audit log', error);
        }
    }

    async deleteMany(params: Prisma.AuditLogDeleteManyArgs) {
        try {
            return await this.prisma.auditLog.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete audit logs', error);
        }
    }

    async count(params?: Prisma.AuditLogCountArgs): Promise<number> {
        try {
            return await this.prisma.auditLog.count(params);
        } catch (error) {
            throw new RepoError('Failed to count audit logs', error);
        }
    }
}
