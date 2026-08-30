import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/database/prisma.service';

export interface HealthReport {
    status: 'ok' | 'degraded';
    database: 'up' | 'down';
    uptimeSeconds: number;
}

@Injectable()
export class HealthService {
    constructor(private readonly prisma: PrismaService) {}

    async check(): Promise<HealthReport> {
        const database = (await this.prisma.ping()) ? 'up' : 'down';

        return {
            status: database === 'up' ? 'ok' : 'degraded',
            database,
            uptimeSeconds: Math.floor(process.uptime()),
        };
    }
}
