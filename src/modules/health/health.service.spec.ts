import { Test } from '@nestjs/testing';
import { PrismaService } from '@common/database/prisma.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
    let service: HealthService;
    let prisma: { ping: jest.Mock };

    beforeEach(async () => {
        prisma = { ping: jest.fn().mockResolvedValue(true) };

        const moduleRef = await Test.createTestingModule({
            providers: [
                HealthService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = moduleRef.get(HealthService);
    });

    it('reports ok while the database answers', async () => {
        await expect(service.check()).resolves.toMatchObject({
            status: 'ok',
            database: 'up',
        });
    });

    it('reports degraded when the database does not answer', async () => {
        prisma.ping.mockResolvedValue(false);

        await expect(service.check()).resolves.toMatchObject({
            status: 'degraded',
            database: 'down',
        });
    });

    it('reports how long the process has been up', async () => {
        const report = await service.check();

        expect(report.uptimeSeconds).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(report.uptimeSeconds)).toBe(true);
    });
});
