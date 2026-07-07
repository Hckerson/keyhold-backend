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
import { AuditAction } from 'generated/prisma/client';
import { RequestWithUser } from '@common/interfaces/req';

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
        const request = httpContext.getRequest<RequestWithUser>();
        const response = httpContext.getResponse();

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
        const startTime = Date.now();

        return next.handle().pipe(
            tap(
                (response: any) => {
                    this.logAuditEvent(
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
                (error: unknown) => {
                    // Also log failed requests for security audit purposes
                    this.logAuditEvent(
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
            ),
        );
    }

    /**
     * Map endpoint path and HTTP method to AuditAction enum
     * Returns null if the endpoint doesn't map to a recognized action
     */
    private mapEndpointToAction(path: string, method: string): AuditAction | null {
        // Normalize path
        const normalizedPath = path.toLowerCase();

        // User actions
        if (normalizedPath.includes('/users') && normalizedPath.includes('/suspend')) {
            return 'SUSPEND_USER' as AuditAction;
        }
        if (
            normalizedPath.includes('/users') &&
            normalizedPath.includes('/unsuspend')
        ) {
            return 'UNSUSPEND_USER' as AuditAction;
        }

        // Dispute actions
        if (normalizedPath.includes('/disputes') && method === 'POST') {
            return 'CREATE_DISPUTE' as AuditAction;
        }
        if (normalizedPath.includes('/disputes') && method === 'PATCH') {
            return 'RESOLVE_DISPUTE' as AuditAction;
        }

        // Generic CRUD mapping
        if (method === 'POST') {
            return 'CREATE' as AuditAction;
        }
        if (method === 'PATCH' || method === 'PUT') {
            return 'UPDATE' as AuditAction;
        }
        if (method === 'DELETE') {
            return 'DELETE' as AuditAction;
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
    private extractResourceId(path: string, response?: any): string | null {
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
        if (response) {
            if (response.id && typeof response.id === 'string') {
                return response.id;
            }
            if (response.data?.id && typeof response.data.id === 'string') {
                return response.data.id;
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
            return !['properties', 'users', 'messages', 'viewings', 'offers', 'transactions', 'connections', 'disputes', 'reviews'].includes(
                str.toLowerCase(),
            );
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
            auditAction: AuditAction;
            request: RequestWithUser;
        },
        response: any,
        error: unknown,
    ): Promise<void> {
        try {
            const resourceId =
                this.extractResourceId(context.path, response) || 'unknown';

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
                    statusCode: response?.statusCode,
                    success: !error,
                },
                afterValue: response,
            });
        } catch (logError: unknown) {
            // Silently fail - audit logging should never block the request
            this.logger.debug(
                `Failed to log audit event: ${logError instanceof Error ? logError.message : 'Unknown error'}`,
            );
        }
    }
}
