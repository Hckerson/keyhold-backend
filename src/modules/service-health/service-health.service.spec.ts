import { Test } from '@nestjs/testing';
import { ServiceMetricRepo } from '@common/repos/service-metric.repo';
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

    const apiRow = async () => {
        const { services } = await service.findAll();
        const row = services.find((entry) => entry.id === ServiceComponent.API);
        if (!row) throw new Error('API row missing');
        return row;
    };

    beforeEach(async () => {
        metrics = { findMany: jest.fn().mockResolvedValue([]) };

        const moduleRef = await Test.createTestingModule({
            providers: [
                ServiceHealthService,
                { provide: ServiceMetricRepo, useValue: metrics },
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
});
