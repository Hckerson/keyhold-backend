import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
    statusCode: number;
    message: string;
    data: T;
    timestamp: string;
}

const normalizeDecimals = (value: unknown, seen = new WeakSet()): unknown => {
    if (value === null || typeof value !== 'object') return value;

    if (Prisma.Decimal.isDecimal(value)) {
        return (value as Prisma.Decimal).toNumber();
    }

    if (value instanceof Date || Buffer.isBuffer(value)) return value;

    // Guard against cycles rather than overflowing the stack on a bad payload.
    if (seen.has(value as object)) return value;
    seen.add(value as object);

    if (Array.isArray(value)) {
        return value.map((entry) => normalizeDecimals(entry, seen));
    }

    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
        output[key] = normalizeDecimals(entry, seen);
    }
    return output;
};

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
    T,
    ApiResponse<T>
> {
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<ApiResponse<T>> {
        const response = context.switchToHttp().getResponse();
        const statusCode =
            (response as Record<string, unknown>).statusCode || 200;

        return next.handle().pipe(
            map((data) => ({
                statusCode: typeof statusCode === 'number' ? statusCode : 200,
                message: 'Success',
                data: normalizeDecimals(data) as T,
                timestamp: new Date().toISOString(),
            })),
        );
    }
}
