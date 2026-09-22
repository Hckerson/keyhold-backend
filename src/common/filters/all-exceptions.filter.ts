import {
    type ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Injectable,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuditActionType } from 'generated/prisma/client';
import { AuditLogService } from '@common/services/audit-log.service';
import { SentryExceptionCaptured } from '@sentry/nestjs';
import { isRecord } from '@common/is-record';

const GENERIC_MESSAGE = 'An unexpected error occurred';
const AUTH_ENTITY = 'AUTH';
const LOGIN_PATH = '/auth/login';

const messageFrom = (exception: HttpException): string | string[] => {
    const response = exception.getResponse();
    if (typeof response === 'string') return response;

    if (isRecord(response)) {
        const { message } = response;
        if (typeof message === 'string' || Array.isArray(message))
            return message;
    }

    return exception.message;
};

@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    constructor(private readonly auditLogService: AuditLogService) {}

    @SentryExceptionCaptured()
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const timestamp = new Date().toISOString();

        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            void this.recordRefusal(status, request);
            response.status(status).json({
                statusCode: status,
                message: messageFrom(exception),
                error: exception.name,
                path: request.url,
                timestamp,
            });
            return;
        }

        this.logger.error(
            `Unhandled exception on ${request.method} ${request.url} [${request.requestId ?? 'no-request-id'}]`,
            exception instanceof Error ? exception.stack : String(exception),
        );

        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: GENERIC_MESSAGE,
            error: 'InternalServerError',
            path: request.url,
            timestamp,
        });
    }

    private async recordRefusal(status: number, request: Request) {
        const path = request.path || request.url;

        if (status === HttpStatus.UNAUTHORIZED && path.includes(LOGIN_PATH)) {
            await this.logSecurityEvent(
                AuditActionType.LOGIN_FAILED,
                AUTH_ENTITY,
                this.attemptedEmail(request) ?? 'unknown',
                null,
                status,
                request,
            );
            return;
        }

        if (status === HttpStatus.FORBIDDEN) {
            await this.logSecurityEvent(
                AuditActionType.PERMISSION_DENIED,
                AUTH_ENTITY,
                path,
                request.user?.id ?? null,
                status,
                request,
            );
        }
    }

    private async logSecurityEvent(
        action: AuditActionType,
        entityType: string,
        entityId: string,
        actorId: string | null,
        statusCode: number,
        request: Request,
    ) {
        try {
            await this.auditLogService.log({
                action,
                resourceType: entityType,
                resourceId: entityId,
                actorId,
                request,
                actionDetails: {
                    method: request.method,
                    path: request.path || request.url,
                    statusCode,
                    success: false,
                },
            });
        } catch (error) {
            this.logger.debug(
                `Failed to record security event: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    private attemptedEmail(request: Request): string | null {
        const body: unknown = request.body;
        if (!isRecord(body)) return null;
        const email = body.email;
        return typeof email === 'string' ? email.toLowerCase() : null;
    }
}
