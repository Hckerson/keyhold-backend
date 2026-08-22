import { Injectable } from '@nestjs/common';
import { ServiceComponent } from '@generated/prisma/enums';
import { ServiceMetricRepo } from '@common/repos/service-metric.repo';

const DEFAULT_WINDOW_HOURS = 24;
const MS_PER_HOUR = 60 * 60 * 1000;
const PERCENT_PRECISION = 100;

const COMPONENT_LABELS: Record<ServiceComponent, string> = {
    DATABASE: 'Database',
    API: 'API gateway',
    SEARCH: 'Search index',
    STORAGE: 'File storage',
    PAYMENTS: 'Payments webhook',
};

const COMPONENTS = Object.keys(COMPONENT_LABELS) as ServiceComponent[];

const round = (value: number, precision: number) =>
    Math.round(value * precision) / precision;

const median = (values: number[]) => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
        : sorted[middle];
};

export interface ServiceHealthRow {
    id: ServiceComponent;
    label: string;
    state: 'operational' | 'degraded' | 'down' | 'unknown';
    uptime: number;
    errorRate: number;
    latencyMs: number;
    samples: number;
}

const DEGRADED_ERROR_RATE = 0.05;
const DOWN_ERROR_RATE = 0.5;

const stateFor = (
    samples: number,
    errorRate: number,
): ServiceHealthRow['state'] => {
    if (samples === 0) return 'unknown';
    if (errorRate >= DOWN_ERROR_RATE) return 'down';
    if (errorRate >= DEGRADED_ERROR_RATE) return 'degraded';
    return 'operational';
};

@Injectable()
export class ServiceHealthService {
    constructor(private serviceMetricRepo: ServiceMetricRepo) {}

    async findAll(windowHours = DEFAULT_WINDOW_HOURS) {
        const since = new Date(Date.now() - windowHours * MS_PER_HOUR);
        const metrics = await this.serviceMetricRepo.findMany({
            where: { createdAt: { gte: since } },
            select: {
                component: true,
                failed: true,
                latencyMs: true,
            },
        });

        const services: ServiceHealthRow[] = COMPONENTS.map((component) => {
            const rows = metrics.filter(
                (metric) => metric.component === component,
            );
            const failures = rows.filter((metric) => metric.failed).length;
            const errorRate = rows.length === 0 ? 0 : failures / rows.length;

            return {
                id: component,
                label: COMPONENT_LABELS[component],
                state: stateFor(rows.length, errorRate),
                uptime:
                    rows.length === 0
                        ? 0
                        : round(
                              ((rows.length - failures) / rows.length) * 100,
                              PERCENT_PRECISION,
                          ),
                errorRate: round(errorRate * 100, PERCENT_PRECISION),
                latencyMs: median(rows.map((metric) => metric.latencyMs)),
                samples: rows.length,
            };
        });

        const measured = services.filter((service) => service.samples > 0);
        const averageUptime =
            measured.length === 0
                ? 0
                : round(
                      measured.reduce(
                          (total, service) => total + service.uptime,
                          0,
                      ) / measured.length,
                      PERCENT_PRECISION,
                  );

        return {
            windowHours,
            since,
            averageUptime,
            services,
        };
    }
}
