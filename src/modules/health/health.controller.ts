import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthService, type HealthReport } from './health.service';

@ApiTags('health')
@Controller('health')
@SkipThrottle()
export class HealthController {
    constructor(private readonly healthService: HealthService) {}

    @Get()
    @ApiOperation({ summary: 'Liveness probe for uptime monitoring' })
    async check(): Promise<HealthReport> {
        const report = await this.healthService.check();
        if (report.database === 'down')
            throw new ServiceUnavailableException(report);
        return report;
    }
}
