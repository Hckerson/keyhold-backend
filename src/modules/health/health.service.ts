import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/database/prisma.service';
import { DatabaseStatus, HealthStatus } from '@common/enums/health';
import { HealthResponseDto } from './dto';

@Injectable()
export class HealthService {
    constructor(private readonly prisma: PrismaService) {}

    async check(): Promise<HealthResponseDto> {
        const database = (await this.prisma.ping())
            ? DatabaseStatus.UP
            : DatabaseStatus.DOWN;

        return {
            status:
                database === DatabaseStatus.UP
                    ? HealthStatus.OK
                    : HealthStatus.DEGRADED,
            database,
            uptimeSeconds: Math.floor(process.uptime()),
        };
    }
}
