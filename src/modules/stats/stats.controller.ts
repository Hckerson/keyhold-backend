import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiQuery,
} from '@nestjs/swagger';
import type { AuthUser } from '@core/auth/types/auth.types';
import { StatsService } from '@common/services/stats/stats.service';
import { TimeFilter } from '@common/enums/filter';
import type { TimeFilterValue } from '@common/enums/filter';
import { UserRole } from '@generated/prisma/enums';
import { JwtAuthGuard, RolesGuard } from '@modules/core/auth/guards';
import { Roles } from '@modules/core/auth/decorators/roles.decorator';
import { CurrentUser } from '@modules/core/auth/decorators/current-user.decorator';
import { ApiEnvelope } from '@common/decorators/api-envelope.decorator';
import { UserGrowthService } from './user-growth.service';
import {
    SeriesQueryDto,
    TotalQueryDto,
    PeriodSeriesResponseDto,
    PeriodTotalResponseDto,
} from './dto';

@ApiTags('stats')
@Controller('stats')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StatsController {
    constructor(
        private readonly statsService: StatsService,
        private readonly userGrowthService: UserGrowthService,
    ) {}

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

    @Get('users/total')
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiOperation({
        summary: 'Users created in one day, month or year (Admin only)',
    })
    @ApiEnvelope(PeriodTotalResponseDto)
    usersTotal(@Query() query: TotalQueryDto) {
        return this.userGrowthService.usersTotal(query);
    }

    @Get('users/series')
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiOperation({
        summary:
            'Users created per day, month or year up to the current one (Admin only)',
    })
    @ApiEnvelope(PeriodSeriesResponseDto)
    usersSeries(@Query() query: SeriesQueryDto) {
        return this.userGrowthService.usersSeries(query);
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
    @ApiQuery({ name: 'filter', enum: TimeFilter, required: false })
    async trend(@Query('filter') filter?: TimeFilterValue) {
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
    @ApiQuery({ name: 'filter', enum: TimeFilter, required: false })
    async dashboard(@Query('filter') filter?: TimeFilterValue) {
        return this.statsService.fetchDashboardStats(
            filter ?? TimeFilter.MONTH,
        );
    }
}
