import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { AuthUser } from '@core/auth/types/auth.types';
import { StatsService } from '@common/services/stats/stats.service';
import { TimeFilter } from '@common/enums/filter';
import { UserRole } from '@generated/prisma/enums';
import { JwtAuthGuard, RolesGuard } from '@modules/core/auth/guards';
import { Roles } from '@modules/core/auth/decorators/roles.decorator';
import { CurrentUser } from '@modules/core/auth/decorators/current-user.decorator';

@ApiTags('stats')
@Controller('stats')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StatsController {
    constructor(private readonly statsService: StatsService) {}

    @Get('seller')
    @ApiOperation({ summary: 'Portfolio stats for the current seller' })
    async seller(@CurrentUser() user: AuthUser) {
        return this.statsService.fetchSellerStats(user.id);
    }

    @Get('platform')
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Platform-wide totals' })
    async platform() {
        return this.statsService.fetchPlatformStats();
    }

    @Get('users')
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'User account status breakdown' })
    async users() {
        return this.statsService.fetchUserStats();
    }

    @Get('regions')
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Listings, volume and average price by region' })
    async regions() {
        return this.statsService.fetchRegionMetrics();
    }

    @Get('trend')
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Monthly GMV, deals, signups and new listings' })
    async trend(@Query('filter') filter?: TimeFilter) {
        return this.statsService.fetchTrend(filter ?? TimeFilter.MONTH);
    }

    @Get('agent')
    @ApiOperation({
        summary: 'Production and benchmarks for the current agent',
    })
    async agent(@CurrentUser() user: AuthUser) {
        return this.statsService.fetchAgentAnalytics(user.id);
    }

    @Get('dashboard')
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Time-series signup counts' })
    async dashboard(@Query('filter') filter?: TimeFilter) {
        const resolved = filter ?? TimeFilter.MONTH;
        return this.statsService.fetchDashboardStats(
            resolved,
            resolved !== TimeFilter.DAY,
        );
    }
}
