import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request } from 'express';
import { ServiceComponent } from '@generated/prisma/enums';
import { ServiceMetricRepo } from '@common/repos/service-metric.repo';

const SERVER_ERROR_FLOOR = 500;

const COMPONENT_BY_PREFIX: [string, ServiceComponent][] = [
    ['/properties/search', ServiceComponent.SEARCH],
    ['/properties', ServiceComponent.STORAGE],
    ['/transactions', ServiceComponent.PAYMENTS],
    ['/escrow', ServiceComponent.PAYMENTS],
];

const componentFor = (route: string): ServiceComponent => {
    const match = COMPONENT_BY_PREFIX.find(([prefix]) =>
        route.startsWith(prefix),
    );
    return match ? match[1] : ServiceComponent.API;
};

const routeOf = (request: Request): string => {
    const route: unknown = request.route;
    if (
        typeof route === 'object' &&
        route !== null &&
        'path' in route &&
        typeof route.path === 'string'
    ) {
        return route.path;
    }
    return request.path;
};

@Injectable()
export class ServiceMetricInterceptor implements NestInterceptor {
    constructor(private serviceMetricRepo: ServiceMetricRepo) {}

    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<unknown> {
        if (context.getType() !== 'http') return next.handle();

        const request = context.switchToHttp().getRequest<Request>();
        const route = routeOf(request);
        const startedAt = Date.now();

        const record = (statusCode: number) => {
            void this.serviceMetricRepo
                .create({
                    data: {
                        route,
                        requestId: request.requestId ?? null,
                        statusCode,
                        latencyMs: Date.now() - startedAt,
                        failed: statusCode >= SERVER_ERROR_FLOOR,
                        component: componentFor(route),
                    },
                })
                .catch(() => undefined);
        };

        return next.handle().pipe(
            tap({
                next: () =>
                    record(
                        context.switchToHttp().getResponse<{
                            statusCode: number;
                        }>().statusCode,
                    ),
                error: (error: { status?: number }) =>
                    record(error?.status ?? SERVER_ERROR_FLOOR),
            }),
        );
    }
}
