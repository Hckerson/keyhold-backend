import { Request } from 'express';
import {
    CallHandler,
    ConflictException,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable, from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { IdempotencyRecordRepo } from '@common/repos/idempotency-record.repo';

const IDEMPOTENCY_HEADER = 'idempotency-key';
const REPLAYABLE_METHOD = 'POST';
const CONFLICT_MESSAGE =
    'This idempotency key was already used for a different request';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
    constructor(private readonly records: IdempotencyRecordRepo) {}

    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<unknown> {
        const request = context.switchToHttp().getRequest<Request>();
        const key = request.headers[IDEMPOTENCY_HEADER];

        if (typeof key !== 'string' || request.method !== REPLAYABLE_METHOD)
            return next.handle();

        const userId = request.user?.id ?? '';
        const path = request.path;

        return from(this.records.findUnique({ where: { key } })).pipe(
            switchMap((record) => {
                if (record) {
                    if (record.userId !== userId || record.path !== path)
                        throw new ConflictException(CONFLICT_MESSAGE);

                    const replayed: unknown = JSON.parse(record.response);
                    return of(replayed);
                }

                return next.handle().pipe(
                    switchMap((response: unknown) =>
                        from(
                            this.records.create({
                                data: {
                                    key,
                                    userId,
                                    method: request.method,
                                    path,
                                    response: JSON.stringify(response ?? null),
                                },
                            }),
                        ).pipe(map(() => response)),
                    ),
                );
            }),
        );
    }
}
