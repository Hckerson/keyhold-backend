import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
    statusCode: number;
    message: string;
    data: T;
    timestamp: string;
}

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
        const statusCode = (response as Record<string, unknown>).statusCode || 200;

        return next.handle().pipe(
            map((data) => ({
                statusCode: typeof statusCode === 'number' ? statusCode : 200,
                message: 'Success',
                data,
                timestamp: new Date().toISOString(),
            })),
        );
    }
}
