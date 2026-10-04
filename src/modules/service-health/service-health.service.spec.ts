import { Test } from '@nestjs/testing';
import { ServiceMetricRepo } from '@common/repos/service-metric.repo';
import {
    IntegrationStatusService,
    type IntegrationStatusRow,
} from '@common/services/integration-status.service';
import { ServiceComponent } from '@generated/prisma/enums';
import { ServiceHealthService } from './service-health.service';

const metric = (latencyMs: number, failed = false) => ({
    component: ServiceComponent.API,
    failed,
    latencyMs,
});

describe('ServiceHealthService.findAll', () => {
    let service: ServiceHealthService;
    let metrics: { findMany: jest.Mock };
    let integrations: IntegrationStatusRow[];

    const apiRow = async () => {
        const { services } = await service.findAll();
        const row = services.find((entry) => entry.id === ServiceComponent.API);
        if (!row) throw new Error('API row missing');
        return row;
    };

    beforeEach(async () => {
        metrics = { findMany: jest.fn().mockResolvedValue([]) };
        integrations = [];

        const moduleRef = await Test.createTestingModule({
            providers: [
                ServiceHealthService,
                { provide: ServiceMetricRepo, useValue: metrics },
                {
                    provide: IntegrationStatusService,
                    useValue: { findAll: () => integrations },
                },
            ],
        }).compile();

        service = moduleRef.get(ServiceHealthService);
    });

    it('reports a slow tail that the median hides', async () => {
        const fast = Array.from({ length: 90 }, () => metric(100));
        const slow = Array.from({ length: 10 }, () => metric(8000));
        metrics.findMany.mockResolvedValue([...fast, ...slow]);

        const row = await apiRow();

        expect(row.latencyMs).toBe(100);
        expect(row.latencyP95).toBe(8000);
        expect(row.latencyP99).toBe(8000);
    });

    it('separates the three latency bands on a spread of samples', async () => {
        metrics.findMany.mockResolvedValue(
            Array.from({ length: 99 }, (_, index) => metric(index + 1)),
        );

        const row = await apiRow();

        expect(row.latencyMs).toBe(50);
        expect(row.latencyP95).toBe(95);
        expect(row.latencyP99).toBe(99);
    });

    it('reports every band as zero when nothing was measured', async () => {
        const row = await apiRow();

        expect(row).toMatchObject({
            latencyMs: 0,
            latencyP95: 0,
            latencyP99: 0,
            samples: 0,
            state: 'unknown',
        });
    });

    it('holds every band finite for a single sample', async () => {
        metrics.findMany.mockResolvedValue([metric(240)]);

        const row = await apiRow();

        expect(row.latencyMs).toBe(240);
        expect(row.latencyP95).toBe(240);
        expect(row.latencyP99).toBe(240);
    });

    it('still reports the error rate alongside the bands', async () => {
        metrics.findMany.mockResolvedValue([
            metric(100),
            metric(200, true),
            metric(300),
            metric(400),
        ]);

        const row = await apiRow();

        expect(row.errorRate).toBe(25);
        expect(row.uptime).toBe(75);
    });

    const withFailures = (total: number, failed: number) =>
        Array.from({ length: total }, (_, index) =>
            metric(100, index < failed),
        );

    it('marks a service below the uptime target as degraded even when its error rate is small', async () => {
        metrics.findMany.mockResolvedValue(withFailures(1000, 23));

        const row = await apiRow();

        expect(row.uptime).toBe(97.7);
        expect(row.state).toBe('degraded');
    });

    it('keeps a service that meets the uptime target operational', async () => {
        metrics.findMany.mockResolvedValue(withFailures(1000, 1));

        const row = await apiRow();

        expect(row.uptime).toBe(99.9);
        expect(row.state).toBe('operational');
    });

    it('reserves down for a service failing half its requests', async () => {
        metrics.findMany.mockResolvedValue(withFailures(10, 5));

        expect((await apiRow()).state).toBe('down');
    });

    it('reports the credential state alongside the measured services', async () => {
        integrations = [
            {
                id: 'stripe',
                label: 'Stripe',
                capability: 'Card payments and refunds',
                configured: false,
                required: true,
            },
        ];

        const health = await service.findAll();

        expect(health.integrations).toEqual(integrations);
    });
});
