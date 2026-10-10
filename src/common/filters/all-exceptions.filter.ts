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
import { databaseOutageReason } from '@common/errors/database-outage-reason';

const GENERIC_MESSAGE = 'An unexpected error occurred';
const DATABASE_UNAVAILABLE_MESSAGE =
    'The service is temporarily unavailable. Try again in a moment.';
const AUTH_ENTITY = 'AUTH';
const LOGIN_PATH = '/auth/login';

const describeRequest = (request: Request) =>
    `${request.method} ${request.url} [${request.requestId ?? 'no-request-id'}]`;

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
        const send = (
            statusCode: number,
            message: string | string[],
            error: string,
        ) =>
            response.status(statusCode).json({
                statusCode,
                message,
                error,
                path: request.url,
                timestamp: new Date().toISOString(),
            });

        const outage = databaseOutageReason(exception);
        if (outage) {
            this.logger.warn(
                `Database unavailable (${outage}) on ${describeRequest(request)}`,
            );
            send(
                HttpStatus.SERVICE_UNAVAILABLE,
                DATABASE_UNAVAILABLE_MESSAGE,
                'ServiceUnavailable',
            );
            return;
        }

        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            if (status >= HttpStatus.INTERNAL_SERVER_ERROR)
                this.logFailure(request, exception.cause ?? exception);
            void this.recordRefusal(status, request);
            send(status, messageFrom(exception), exception.name);
            return;
        }

        this.logFailure(request, exception);
        send(
            HttpStatus.INTERNAL_SERVER_ERROR,
            GENERIC_MESSAGE,
            'InternalServerError',
        );
    }

    private logFailure(request: Request, error: unknown) {
        this.logger.error(
            `Unhandled exception on ${describeRequest(request)}`,
            error instanceof Error ? error.stack : String(error),
        );
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
