import { randomUUID } from 'node:crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

const MAX_LENGTH = 128;

const inboundId = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_LENGTH) return null;
    return /^[A-Za-z0-9._-]+$/.test(trimmed) ? trimmed : null;
};

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
    use(request: Request, response: Response, next: NextFunction) {
        const requestId =
            inboundId(request.headers[REQUEST_ID_HEADER]) ?? randomUUID();

        request.requestId = requestId;
        response.setHeader(REQUEST_ID_HEADER, requestId);
        next();
    }
}
