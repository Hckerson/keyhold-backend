import {
    Controller,
    DefaultValuePipe,
    Get,
    ParseIntPipe,
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiQuery,
} from '@nestjs/swagger';
import { UserRole } from '@generated/prisma/enums';
import { JwtAuthGuard, RolesGuard } from '@modules/core/auth/guards';
import { Roles } from '@modules/core/auth/decorators/roles.decorator';
import { ServiceHealthService } from './service-health.service';

const DEFAULT_WINDOW_HOURS = 24;

@ApiTags('service-health')
@Controller('service-health')
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ServiceHealthController {
    constructor(private readonly serviceHealthService: ServiceHealthService) {}

    @Get()
    @ApiQuery({ name: 'windowHours', required: false, example: 24 })
    @ApiOperation({
        summary: 'Uptime, error rate and latency measured from live traffic',
    })
    async findAll(
        @Query(
            'windowHours',
            new DefaultValuePipe(DEFAULT_WINDOW_HOURS),
            ParseIntPipe,
        )
        windowHours: number,
    ) {
        return this.serviceHealthService.findAll(windowHours);
    }
}
