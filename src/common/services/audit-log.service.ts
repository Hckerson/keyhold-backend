import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import { IsString, IsOptional } from 'class-validator';
import { AuditActionType } from 'generated/prisma/client';
import { AuditLogRepo } from '@common/repos/audit-log.repo';

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
    actorId: string | null;
    transactionId?: string;
    request?: Request;
    actionDetails?: AuditActionDetailsDto;
    beforeValue?: unknown;
    afterValue?: unknown;
}

/**
 * Audit Log Service
 * Records audit events triggered by HTTP requests via the AuditLogInterceptor
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
                    requestId: params.request?.requestId ?? null,
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
     * Extract IP address from request
     */
    private extractIpAddress(request: Request): string | null {
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
        if (request.ip && typeof request.ip === 'string') {
            return request.ip;
        }

        if (
            request.socket &&
            'remoteAddress' in request.socket &&
            typeof request.socket.remoteAddress === 'string'
        ) {
            return request.socket.remoteAddress;
        }

        return null;
    }

    /**
     * Extract User-Agent header from request
     */
    private extractUserAgent(request: Request): string | null {
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
}
