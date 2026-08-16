import { Request } from 'express';
import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogService } from '@common/services/audit-log.service';
import { AuditActionType } from 'generated/prisma/client';

/**
 * Audit Log Interceptor
 * Automatically logs state-changing requests (POST, PATCH, DELETE)
 * Extracts endpoint path, maps to audit action, and logs with response data
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
    private readonly logger = new Logger(AuditLogInterceptor.name);

    constructor(private auditLogService: AuditLogService) {}

    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<unknown> {
        const httpContext = context.switchToHttp();
        const request = httpContext.getRequest<Request>();

        // Only log state-changing requests
        const method = request.method.toUpperCase();
        if (!['POST', 'PATCH', 'DELETE', 'PUT'].includes(method)) {
            return next.handle();
        }

        // Skip logging if no user is present
        if (!request.user) {
            return next.handle();
        }

        const path = request.path || request.url;
        const auditAction = this.mapEndpointToAction(path, method);

        // If we can't map the endpoint to an audit action, skip logging
        if (!auditAction) {
            return next.handle();
        }

        const resourceType = this.extractResourceType(path);

        return next.handle().pipe(
            tap({
                next: (response: unknown) => {
                    void this.logAuditEvent(
                        {
                            path,
                            method,
                            resourceType,
                            auditAction,
                            request,
                        },
                        response,
                        null,
                    );
                },
                error: (error: unknown) => {
                    void this.logAuditEvent(
                        {
                            path,
                            method,
                            resourceType,
                            auditAction,
                            request,
                        },
                        null,
                        error,
                    );
                },
            }),
        );
    }

    /**
     * Map endpoint path and HTTP method to AuditActionType enum
     * Returns null if the endpoint doesn't map to a recognized action
     */
    private mapEndpointToAction(
        path: string,
        method: string,
    ): AuditActionType | null {
        const normalizedPath = path.toLowerCase();

        if (normalizedPath.includes('/users')) {
            if (normalizedPath.includes('/suspend')) {
                return 'USER_SUSPENDED' as AuditActionType;
            }
            if (method === 'POST') {
                return 'USER_CREATED' as AuditActionType;
            }
            if (method === 'PATCH' || method === 'PUT') {
                return 'USER_UPDATED' as AuditActionType;
            }
            if (method === 'DELETE') {
                return 'USER_DELETED' as AuditActionType;
            }
        }

        if (normalizedPath.includes('/properties')) {
            if (method === 'POST') {
                return 'PROPERTY_CREATED' as AuditActionType;
            }
            if (method === 'PATCH' || method === 'PUT') {
                return 'PROPERTY_UPDATED' as AuditActionType;
            }
            if (method === 'DELETE') {
                return 'PROPERTY_DELETED' as AuditActionType;
            }
        }

        if (normalizedPath.includes('/disputes')) {
            if (method === 'POST') {
                return 'DISPUTE_CREATED' as AuditActionType;
            }
            if (method === 'PATCH' || method === 'PUT') {
                return 'DISPUTE_RESOLVED' as AuditActionType;
            }
        }

        if (normalizedPath.includes('/offers')) {
            if (method === 'POST') {
                return 'OFFER_CREATED' as AuditActionType;
            }
            if (method === 'PATCH' || method === 'PUT') {
                return 'OFFER_ACCEPTED' as AuditActionType;
            }
        }

        if (normalizedPath.includes('/transactions')) {
            if (method === 'POST') {
                return 'TRANSACTION_CREATED' as AuditActionType;
            }
            if (method === 'PATCH' || method === 'PUT') {
                return 'TRANSACTION_UPDATED' as AuditActionType;
            }
        }

        return null;
    }

    /**
     * Extract resource type from endpoint path
     * e.g., /properties/:id → "PROPERTY", /users/:id → "USER"
     */
    private extractResourceType(path: string): string {
        const normalizedPath = path.toLowerCase();

        if (normalizedPath.includes('/properties')) {
            return 'PROPERTY';
        }
        if (normalizedPath.includes('/users')) {
            return 'USER';
        }
        if (normalizedPath.includes('/transactions')) {
            return 'TRANSACTION';
        }
        if (normalizedPath.includes('/offers')) {
            return 'OFFER';
        }
        if (normalizedPath.includes('/viewings')) {
            return 'VIEWING';
        }
        if (normalizedPath.includes('/connections')) {
            return 'CONNECTION';
        }
        if (normalizedPath.includes('/messages')) {
            return 'MESSAGE';
        }
        if (normalizedPath.includes('/disputes')) {
            return 'DISPUTE';
        }
        if (normalizedPath.includes('/reviews')) {
            return 'REVIEW';
        }
        if (normalizedPath.includes('/escrow')) {
            return 'ESCROW';
        }
        if (normalizedPath.includes('/flags')) {
            return 'FLAG';
        }
        if (normalizedPath.includes('/kyc')) {
            return 'KYC';
        }
        if (normalizedPath.includes('/suspensions')) {
            return 'SUSPENSION';
        }

        // Extract from first path segment if not matched
        const segments = path.split('/').filter((s) => s.length > 0);
        if (segments.length > 0) {
            return segments[0].toUpperCase();
        }

        return 'UNKNOWN';
    }

    /**
     * Extract resource ID from response or path
     */
    private extractResourceId(path: string, response?: unknown): string | null {
        // Try to extract from path first (e.g., /properties/123)
        const pathSegments = path.split('/').filter((s) => s.length > 0);
        if (pathSegments.length >= 2) {
            const potentialId = pathSegments[pathSegments.length - 1];
            // Check if it looks like an ID (UUID or number)
            if (this.isValidId(potentialId)) {
                return potentialId;
            }
        }

        // Try to extract from response
        if (response && typeof response === 'object') {
            const obj = response as Record<string, unknown>;
            if (obj.id && typeof obj.id === 'string') {
                return obj.id;
            }
            if (obj.data && typeof obj.data === 'object' && obj.data !== null) {
                const dataObj = obj.data as Record<string, unknown>;
                if (dataObj.id && typeof dataObj.id === 'string') {
                    return dataObj.id;
                }
            }
        }

        return null;
    }

    /**
     * Check if a string looks like a valid ID (UUID or alphanumeric)
     */
    private isValidId(str: string): boolean {
        // UUID pattern
        const uuidPattern =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidPattern.test(str)) {
            return true;
        }

        // Numeric ID
        if (/^\d+$/.test(str)) {
            return true;
        }

        // Alphanumeric ID (excluding common non-ID segments)
        if (/^[a-z0-9_-]{8,}$/i.test(str)) {
            return ![
                'properties',
                'users',
                'messages',
                'viewings',
                'offers',
                'transactions',
                'connections',
                'disputes',
                'reviews',
            ].includes(str.toLowerCase());
        }

        return false;
    }

    /**
     * Log the audit event
     */
    private async logAuditEvent(
        context: {
            path: string;
            method: string;
            resourceType: string;
            auditAction: AuditActionType;
            request: Request;
        },
        response: unknown,
        logError: unknown,
    ): Promise<void> {
        try {
            const resourceId =
                this.extractResourceId(context.path, response) || 'unknown';

            const statusCode =
                response && typeof response === 'object'
                    ? (response as Record<string, unknown>).statusCode
                    : undefined;

            await this.auditLogService.log({
                resourceType: context.resourceType,
                resourceId,
                action: context.auditAction,
                actorId: context.request.user?.id || 'unknown',
                transactionId: context.request.headers?.['x-transaction-id'] as
                    | string
                    | undefined,
                request: context.request,
                actionDetails: {
                    method: context.method,
                    path: context.path,
                    statusCode:
                        typeof statusCode === 'number' ? statusCode : undefined,
                    success: !logError,
                },
                afterValue: response,
            });
        } catch (catchError: unknown) {
            this.logger.debug(
                `Failed to log audit event: ${catchError instanceof Error ? catchError.message : 'Unknown error'}`,
            );
        }
    }
}
