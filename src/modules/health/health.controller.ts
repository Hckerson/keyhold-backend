import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { DatabaseStatus } from '@common/enums/health';
import { ApiEnvelope } from '@common/decorators/api-envelope.decorator';
import { HealthResponseDto } from './dto';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
@SkipThrottle()
export class HealthController {
    constructor(private readonly healthService: HealthService) {}

    @Get()
    @ApiOperation({ summary: 'Liveness probe for uptime monitoring' })
    @ApiEnvelope(HealthResponseDto)
    async check(): Promise<HealthResponseDto> {
        const report = await this.healthService.check();
        if (report.database === DatabaseStatus.DOWN)
            throw new ServiceUnavailableException(report);
        return report;
    }
}
