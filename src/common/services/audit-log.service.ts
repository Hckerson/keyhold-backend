import {
    Injectable,
    Logger,
    BadRequestException,
    InternalServerErrorException,
} from '@nestjs/common';
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsISO8601,
    IsEnum,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Prisma, AuditActionType } from 'generated/prisma/client';
import { AuditLogRepo } from '@common/repos/audit-log.repo';
import { RequestWithUser } from '@common/interfaces/req';

/**
 * Audit log action details (for state-changing requests)
 */
export class AuditActionDetailsDto {
    @IsString()
    @IsOptional()
    method?: string;

    @IsString()
    @IsOptional()
    path?: string;

    @IsOptional()
    statusCode?: number;

    @IsOptional()
    success?: boolean;

    @IsString()
    @IsOptional()
    errorMessage?: string;
}

/**
 * Parameters for logging an audit event (from interceptor)
 */
export interface AuditLogParams {
    resourceType: string;
    resourceId: string;
    action: AuditActionType;
    actorId: string;
    transactionId?: string;
    request?: RequestWithUser;
    actionDetails?: AuditActionDetailsDto;
    beforeValue?: unknown;
    afterValue?: unknown;
}

/**
 * Audit log response DTO
 */
export class AuditLogResponseDto {
    @IsString()
    id: string;

    @IsEnum(AuditActionType)
    action: AuditActionType;

    @IsString()
    entityType: string;

    @IsString()
    entityId: string;

    @IsString()
    actorId: string;

    @IsString()
    @IsOptional()
    changes?: string;

    @IsString()
    @IsOptional()
    ipAddress?: string;

    @IsString()
    @IsOptional()
    userAgent?: string;

    @IsISO8601()
    createdAt: Date;
}

/**
 * Audit log filter DTO
 */
export class AuditLogFilterDto {
    @IsString()
    @IsOptional()
    actorId?: string;

    @IsString()
    @IsOptional()
    entityId?: string;

    @IsString()
    @IsOptional()
    entityType?: string;

    @IsEnum(AuditActionType)
    @IsOptional()
    action?: AuditActionType;

    @IsISO8601()
    @IsOptional()
    startDate?: string;

    @IsISO8601()
    @IsOptional()
    endDate?: string;
}

/**
 * Audit log statistics response DTO
 */
export class AuditLogStatisticsDto {
    @IsOptional()
    total: number;

    @IsOptional()
    byAction: Record<string, number>;

    @IsOptional()
    byActor: Record<string, number>;

    @IsOptional()
    avgPerDay: number;
}

/**
 * Audit Log Service
 * Handles logging of state-changing operations and audit log queries
 *
 * Responsibilities:
 * - Record audit events triggered by HTTP requests (via interceptor)
 * - Retrieve audit logs with filtering and pagination
 * - Analyze audit logs for compliance and security audits
 * - Export audit logs for external audit purposes
 */
@Injectable()
export class AuditLogService {
    private readonly logger = new Logger(AuditLogService.name);

    constructor(private auditLogRepo: AuditLogRepo) {}

    /**
     * Log an audit event
     * Called by AuditLogInterceptor for all state-changing requests
     *
     * @param params Audit log parameters from interceptor
     * Failures in audit logging are caught and logged but do not throw to prevent blocking the request
     */
    async log(params: AuditLogParams): Promise<void> {
        try {
            // Extract IP address and user agent from request if available
            const ipAddress = params.request
                ? this.extractIpAddress(params.request)
                : null;
            const userAgent = params.request
                ? this.extractUserAgent(params.request)
                : null;

            // Prepare changes JSON from before/after values and action details
            const changesJson = this.prepareChangesJson(
                params.beforeValue,
                params.afterValue,
                params.actionDetails,
            );

            // Create audit log entry via repository
            await this.auditLogRepo.create({
                data: {
                    action: params.action,
                    entityType: params.resourceType,
                    entityId: params.resourceId,
                    changes: changesJson,
                    ipAddress,
                    userAgent,
                    actorId: params.actorId,
                },
            });
        } catch (error) {
            // Log error but don't throw - audit logging should never block requests
            this.logger.error(
                `Failed to log audit event: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    /**
     * Retrieve audit logs for a specific resource
     *
     * @param resourceId The resource identifier
     * @param limit Maximum number of results
     * @param offset Pagination offset
     * @returns Array of audit log entries
     */
    async getResourceAuditHistory(
        resourceId: string,
        limit: number = 50,
        offset: number = 0,
    ): Promise<AuditLogResponseDto[]> {
        try {
            if (!resourceId || resourceId.trim() === '') {
                throw new BadRequestException('Resource ID is required');
            }

            if (limit < 1 || limit > 500) {
                throw new BadRequestException(
                    'Limit must be between 1 and 500',
                );
            }

            if (offset < 0) {
                throw new BadRequestException('Offset must be non-negative');
            }

            const auditLogs = await this.auditLogRepo.findByResourceId({
                where: {
                    entityId: resourceId,
                },
                orderBy: {
                    createdAt: 'desc',
                },
                take: limit,
                skip: offset,
            });

            return auditLogs.map((log) => this.mapToResponseDto(log));
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }

            this.logger.error(
                `Failed to retrieve resource audit history: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            throw new InternalServerErrorException(
                'Failed to retrieve audit history',
            );
        }
    }

    /**
     * Retrieve audit logs by actor (user who performed the action)
     *
     * @param actorId The user identifier
     * @param limit Maximum number of results
     * @param offset Pagination offset
     * @returns Array of audit log entries
     */
    async getUserAuditHistory(
        actorId: string,
        limit: number = 50,
        offset: number = 0,
    ): Promise<AuditLogResponseDto[]> {
        try {
            if (!actorId || actorId.trim() === '') {
                throw new BadRequestException('Actor ID is required');
            }

            if (limit < 1 || limit > 500) {
                throw new BadRequestException(
                    'Limit must be between 1 and 500',
                );
            }

            if (offset < 0) {
                throw new BadRequestException('Offset must be non-negative');
            }

            const auditLogs = await this.auditLogRepo.findByActorId({
                where: {
                    actorId,
                },
                orderBy: {
                    createdAt: 'desc',
                },
                take: limit,
                skip: offset,
            });

            return auditLogs.map((log) => this.mapToResponseDto(log));
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }

            this.logger.error(
                `Failed to retrieve user audit history: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            throw new InternalServerErrorException(
                'Failed to retrieve audit history',
            );
        }
    }

    /**
     * Search audit logs with multiple filters
     *
     * @param filters Audit log filter criteria
     * @param limit Maximum number of results
     * @param offset Pagination offset
     * @returns Array of matching audit log entries
     */
    async searchAuditLogs(
        filters: AuditLogFilterDto,
        limit: number = 50,
        offset: number = 0,
    ): Promise<AuditLogResponseDto[]> {
        try {
            if (limit < 1 || limit > 500) {
                throw new BadRequestException(
                    'Limit must be between 1 and 500',
                );
            }

            if (offset < 0) {
                throw new BadRequestException('Offset must be non-negative');
            }

            // Build where clause from filters
            const where: Prisma.AuditLogWhereInput = {};

            if (filters.actorId) {
                where.actorId = filters.actorId;
            }

            if (filters.entityId) {
                where.entityId = filters.entityId;
            }

            if (filters.entityType) {
                where.entityType = filters.entityType;
            }

            if (filters.action) {
                where.action = filters.action;
            }

            if (filters.startDate || filters.endDate) {
                where.createdAt = {};
                if (filters.startDate) {
                    const startDate = new Date(filters.startDate);
                    if (isNaN(startDate.getTime())) {
                        throw new BadRequestException(
                            'Invalid start date format',
                        );
                    }
                    (
                        where.createdAt as Record<
                            string,
                            Date | Record<string, Date>
                        >
                    ).gte = startDate;
                }
                if (filters.endDate) {
                    const endDate = new Date(filters.endDate);
                    if (isNaN(endDate.getTime())) {
                        throw new BadRequestException(
                            'Invalid end date format',
                        );
                    }
                    (
                        where.createdAt as Record<
                            string,
                            Date | Record<string, Date>
                        >
                    ).lte = endDate;
                }
            }

            const auditLogs = await this.auditLogRepo.search({
                where,
                orderBy: {
                    createdAt: 'desc',
                },
                take: limit,
                skip: offset,
            });

            return auditLogs.map((log) => this.mapToResponseDto(log));
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }

            this.logger.error(
                `Failed to search audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            throw new InternalServerErrorException(
                'Failed to search audit logs',
            );
        }
    }

    /**
     * Get recent audit log entries
     *
     * @param limit Maximum number of results
     * @returns Array of recent audit log entries
     */
    async getRecentAuditLogs(
        limit: number = 100,
    ): Promise<AuditLogResponseDto[]> {
        try {
            if (limit < 1 || limit > 1000) {
                throw new BadRequestException(
                    'Limit must be between 1 and 1000',
                );
            }

            const auditLogs = await this.auditLogRepo.findRecent(limit);
            return auditLogs.map((log) => this.mapToResponseDto(log));
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }

            this.logger.error(
                `Failed to retrieve recent audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            throw new InternalServerErrorException(
                'Failed to retrieve recent audit logs',
            );
        }
    }

    /**
     * Get audit statistics for the specified time period
     *
     * @param days Number of days to look back (default: 30)
     * @returns Audit statistics including counts by action and actor
     */
    async getAuditStatistics(days: number = 30): Promise<AuditLogStatisticsDto> {
        try {
            if (days < 1 || days > 365) {
                throw new BadRequestException(
                    'Days must be between 1 and 365',
                );
            }

            const statistics = await this.auditLogRepo.getStatistics(days);
            return statistics;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }

            this.logger.error(
                `Failed to get audit statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            throw new InternalServerErrorException(
                'Failed to retrieve audit statistics',
            );
        }
    }

    /**
     * Get sensitive audit actions (deletions, suspensions, disputes)
     *
     * @param limit Maximum number of results
     * @returns Array of sensitive audit log entries
     */
    async getSensitiveActions(limit: number = 100): Promise<AuditLogResponseDto[]> {
        try {
            if (limit < 1 || limit > 1000) {
                throw new BadRequestException(
                    'Limit must be between 1 and 1000',
                );
            }

            const auditLogs = await this.auditLogRepo.findSensitiveActions();
            return auditLogs
                .slice(0, limit)
                .map((log) => this.mapToResponseDto(log));
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }

            this.logger.error(
                `Failed to retrieve sensitive actions: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            throw new InternalServerErrorException(
                'Failed to retrieve sensitive actions',
            );
        }
    }

    /**
     * Get audit logs within a date range
     *
     * @param startDate Start date for the range
     * @param endDate End date for the range
     * @returns Array of audit log entries within the range
     */
    async getAuditsByDateRange(
        startDate: Date,
        endDate: Date,
    ): Promise<AuditLogResponseDto[]> {
        try {
            if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
                throw new BadRequestException('Invalid start date');
            }

            if (!(endDate instanceof Date) || isNaN(endDate.getTime())) {
                throw new BadRequestException('Invalid end date');
            }

            if (startDate > endDate) {
                throw new BadRequestException(
                    'Start date must be before end date',
                );
            }

            const auditLogs = await this.auditLogRepo.findByDateRange(
                startDate,
                endDate,
            );

            return auditLogs.map((log) => this.mapToResponseDto(log));
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }

            this.logger.error(
                `Failed to retrieve audit logs by date range: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            throw new InternalServerErrorException(
                'Failed to retrieve audit logs',
            );
        }
    }

    /**
     * Get all changes (before/after values) for a specific resource
     *
     * @param resourceId The resource identifier
     * @returns Array of audit log entries with value changes
     */
    async getResourceChanges(resourceId: string): Promise<AuditLogResponseDto[]> {
        try {
            if (!resourceId || resourceId.trim() === '') {
                throw new BadRequestException('Resource ID is required');
            }

            const auditLogs = await this.auditLogRepo.findChanges(resourceId);
            return auditLogs.map((log) => this.mapToResponseDto(log));
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }

            this.logger.error(
                `Failed to retrieve resource changes: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            throw new InternalServerErrorException(
                'Failed to retrieve resource changes',
            );
        }
    }

    /**
     * Export audit logs for external audit purposes
     *
     * @param filters Optional filters for export
     * @returns Array of audit log entries for export
     */
    async exportAuditLogs(
        filters?: Partial<AuditLogFilterDto>,
    ): Promise<AuditLogResponseDto[]> {
        try {
            const exportFilters = filters
                ? this.buildExportFilters(filters)
                : undefined;

            const auditLogs = await this.auditLogRepo.export(exportFilters);
            return auditLogs.map((log) => this.mapToResponseDto(log));
        } catch (error) {
            this.logger.error(
                `Failed to export audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            throw new InternalServerErrorException(
                'Failed to export audit logs',
            );
        }
    }

    /**
     * Get user activity summary (all actions by user in specified period)
     *
     * @param userId The user identifier
     * @param days Number of days to look back (default: 7)
     * @returns Array of audit log entries for the user
     */
    async getUserActivitySummary(
        userId: string,
        days: number = 7,
    ): Promise<AuditLogResponseDto[]> {
        try {
            if (!userId || userId.trim() === '') {
                throw new BadRequestException('User ID is required');
            }

            if (days < 1 || days > 365) {
                throw new BadRequestException(
                    'Days must be between 1 and 365',
                );
            }

            const auditLogs = await this.auditLogRepo.getUserActivitySummary(
                userId,
                days,
            );
            return auditLogs.map((log) => this.mapToResponseDto(log));
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }

            this.logger.error(
                `Failed to retrieve user activity summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            throw new InternalServerErrorException(
                'Failed to retrieve user activity summary',
            );
        }
    }

    /**
     * Map Prisma AuditLog to response DTO
     */
    private mapToResponseDto(
        auditLog: Prisma.AuditLogGetPayload<{ include: Record<string, never> }>,
    ): AuditLogResponseDto {
        return {
            id: auditLog.id,
            action: auditLog.action,
            entityType: auditLog.entityType,
            entityId: auditLog.entityId,
            actorId: auditLog.actorId,
            changes: auditLog.changes || undefined,
            ipAddress: auditLog.ipAddress || undefined,
            userAgent: auditLog.userAgent || undefined,
            createdAt: auditLog.createdAt,
        };
    }

    /**
     * Extract IP address from request
     */
    private extractIpAddress(request: RequestWithUser): string | null {
        // Check for X-Forwarded-For header (common with proxies)
        const forwarded = request.get?.('x-forwarded-for');
        if (forwarded && typeof forwarded === 'string') {
            return forwarded.split(',')[0].trim();
        }

        // Check for X-Real-IP header
        const realIp = request.get?.('x-real-ip');
        if (realIp && typeof realIp === 'string') {
            return realIp;
        }

        // Use socket.remoteAddress or ip property
        if (
            request.ip &&
            typeof request.ip === 'string'
        ) {
            return request.ip;
        }

        if (
            request.socket &&
            'remoteAddress' in request.socket &&
            typeof (request.socket as Record<string, unknown>).remoteAddress ===
                'string'
        ) {
            return (request.socket as Record<string, unknown>)
                .remoteAddress as string;
        }

        return null;
    }

    /**
     * Extract User-Agent header from request
     */
    private extractUserAgent(request: RequestWithUser): string | null {
        const userAgent = request.get?.('user-agent');
        return userAgent && typeof userAgent === 'string' ? userAgent : null;
    }

    /**
     * Prepare changes JSON from before/after values and action details
     */
    private prepareChangesJson(
        beforeValue: unknown,
        afterValue: unknown,
        actionDetails?: AuditActionDetailsDto,
    ): string | null {
        const changes: Record<string, unknown> = {};

        if (beforeValue !== undefined && beforeValue !== null) {
            changes.before = beforeValue;
        }

        if (afterValue !== undefined && afterValue !== null) {
            changes.after = afterValue;
        }

        if (actionDetails) {
            changes.details = actionDetails;
        }

        if (Object.keys(changes).length === 0) {
            return null;
        }

        try {
            return JSON.stringify(changes);
        } catch (error) {
            this.logger.warn(
                `Failed to serialize audit changes: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            return null;
        }
    }

    /**
     * Build export filters from AuditLogFilterDto
     */
    private buildExportFilters(
        filters: Partial<AuditLogFilterDto>,
    ): Partial<{
        startDate: Date;
        endDate: Date;
        action: AuditActionType;
        actorId: string;
        resourceId: string;
    }> | undefined {
        const exportFilters: Record<string, unknown> = {};

        if (filters.startDate) {
            try {
                const startDate = new Date(filters.startDate);
                if (isNaN(startDate.getTime())) {
                    throw new BadRequestException('Invalid start date format');
                }
                exportFilters.startDate = startDate;
            } catch (error) {
                throw new BadRequestException('Invalid start date format');
            }
        }

        if (filters.endDate) {
            try {
                const endDate = new Date(filters.endDate);
                if (isNaN(endDate.getTime())) {
                    throw new BadRequestException('Invalid end date format');
                }
                exportFilters.endDate = endDate;
            } catch (error) {
                throw new BadRequestException('Invalid end date format');
            }
        }

        if (filters.action) {
            exportFilters.action = filters.action;
        }

        if (filters.actorId) {
            exportFilters.actorId = filters.actorId;
        }

        if (filters.entityId) {
            exportFilters.resourceId = filters.entityId;
        }

        return Object.keys(exportFilters).length > 0
            ? (exportFilters as Partial<{
                  startDate: Date;
                  endDate: Date;
                  action: AuditActionType;
                  actorId: string;
                  resourceId: string;
              }>)
            : undefined;
    }
}
