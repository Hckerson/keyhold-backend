import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { AuditLogRepo } from '@common/repos/audit-log.repo';
import { QueryAuditLogDto } from './dto';

const DEFAULT_LIMIT = 20;

const ACTOR_INCLUDE = {
    actor: { select: { id: true, fullName: true, email: true, role: true } },
} satisfies Prisma.AuditLogInclude;

@Injectable()
export class AuditLogsService {
    constructor(private auditLogRepo: AuditLogRepo) {}

    async findAll(query: QueryAuditLogDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? DEFAULT_LIMIT;
        const where: Prisma.AuditLogWhereInput = {
            action: query.action,
            entityType: query.entityType,
            entityId: query.entityId,
            actorId: query.actorId,
        };

        const [items, total] = await Promise.all([
            this.auditLogRepo.findMany({
                where,
                include: ACTOR_INCLUDE,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.auditLogRepo.count({ where }),
        ]);

        return {
            items,
            total,
            page,
            limit,
            pageCount: Math.max(1, Math.ceil(total / limit)),
        };
    }
}
