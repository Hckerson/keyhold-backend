import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from 'generated/prisma/client';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse {
    statusCode: number;
    message: string;
    data: unknown;
    timestamp: string;
}

const normalizeDecimals = (value: unknown, seen = new WeakSet()): unknown => {
    if (value === null || typeof value !== 'object') return value;

    if (Prisma.Decimal.isDecimal(value)) {
        return value.toNumber();
    }

    if (value instanceof Date || Buffer.isBuffer(value)) return value;

    if (seen.has(value)) return value;
    seen.add(value);

    if (Array.isArray(value)) {
        return value.map((entry) => normalizeDecimals(entry, seen));
    }

    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
        output[key] = normalizeDecimals(entry, seen);
    }
    return output;
};

@Injectable()
export class ResponseInterceptor implements NestInterceptor<
    unknown,
    ApiResponse
> {
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<ApiResponse> {
        const response = context.switchToHttp().getResponse<Response>();
        const statusCode = response.statusCode || 200;

        return next.handle().pipe(
            map((data: unknown) => ({
                statusCode,
                message: 'Success',
                data: normalizeDecimals(data),
                timestamp: new Date().toISOString(),
            })),
        );
    }
}
