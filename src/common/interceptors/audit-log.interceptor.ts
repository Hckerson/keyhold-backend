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
import { isRecord } from '@common/is-record';

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NUMERIC_ID_PATTERN = /^\d+$/;

const SLUG_ID_PATTERN = /^[a-z0-9_-]{8,}$/i;

const RESOURCE_SEGMENTS = [
    'properties',
    'users',
    'messages',
    'viewings',
    'offers',
    'transactions',
    'connections',
    'disputes',
    'reviews',
];

const idOf = (value: unknown): string | null =>
    isRecord(value) && typeof value.id === 'string' && value.id
        ? value.id
        : null;

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

        const method = request.method.toUpperCase();
        if (!['POST', 'PATCH', 'DELETE', 'PUT'].includes(method)) {
            return next.handle();
        }

        if (!request.user) {
            return next.handle();
        }

        const path = request.path || request.url;
        const auditAction = this.mapEndpointToAction(path, method);

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

    private mapEndpointToAction(
        path: string,
        method: string,
    ): AuditActionType | null {
        const normalizedPath = path.toLowerCase();

        if (normalizedPath.includes('/users')) {
            if (normalizedPath.includes('/suspend')) {
                return AuditActionType.USER_SUSPENDED;
            }
            if (method === 'POST') {
                return AuditActionType.USER_CREATED;
            }
            if (method === 'PATCH' || method === 'PUT') {
                return AuditActionType.USER_UPDATED;
            }
            if (method === 'DELETE') {
                return AuditActionType.USER_DELETED;
            }
        }

        if (normalizedPath.includes('/properties')) {
            if (method === 'POST') {
                return AuditActionType.PROPERTY_CREATED;
            }
            if (method === 'PATCH' || method === 'PUT') {
                return AuditActionType.PROPERTY_UPDATED;
            }
            if (method === 'DELETE') {
                return AuditActionType.PROPERTY_DELETED;
            }
        }

        if (normalizedPath.includes('/disputes')) {
            if (method === 'POST') {
                return AuditActionType.DISPUTE_CREATED;
            }
            if (method === 'PATCH' || method === 'PUT') {
                return AuditActionType.DISPUTE_RESOLVED;
            }
        }

        if (normalizedPath.includes('/offers')) {
            if (method === 'POST') {
                return AuditActionType.OFFER_CREATED;
            }
            if (method === 'PATCH' || method === 'PUT') {
                return AuditActionType.OFFER_ACCEPTED;
            }
        }

        if (normalizedPath.includes('/transactions')) {
            if (method === 'POST') {
                return AuditActionType.TRANSACTION_CREATED;
            }
            if (method === 'PATCH' || method === 'PUT') {
                return AuditActionType.TRANSACTION_UPDATED;
            }
        }

        if (normalizedPath.includes('/settings')) {
            return AuditActionType.SETTINGS_UPDATED;
        }

        return null;
    }

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
        if (normalizedPath.includes('/settings')) {
            return 'SETTING';
        }

        const segments = path.split('/').filter((s) => s.length > 0);
        if (segments.length > 0) {
            return segments[0].toUpperCase();
        }

        return 'UNKNOWN';
    }

    private extractResourceId(path: string, response?: unknown): string | null {
        const pathSegments = path.split('/').filter((s) => s.length > 0);
        if (pathSegments.length >= 2) {
            const potentialId = pathSegments[pathSegments.length - 1];
            if (this.isValidId(potentialId)) {
                return potentialId;
            }
        }

        return (
            idOf(response) ?? (isRecord(response) ? idOf(response.data) : null)
        );
    }

    private isValidId(str: string): boolean {
        if (UUID_PATTERN.test(str) || NUMERIC_ID_PATTERN.test(str)) return true;

        return (
            SLUG_ID_PATTERN.test(str) &&
            !RESOURCE_SEGMENTS.includes(str.toLowerCase())
        );
    }

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

            const statusCode = isRecord(response)
                ? response.statusCode
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
