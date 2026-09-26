import { Module } from '@nestjs/common';
import { StatsService } from '@common/services/stats/stats.service';
import { StatsController } from './stats.controller';
import { UserGrowthService } from './user-growth.service';

@Module({
    providers: [StatsService, UserGrowthService],
    controllers: [StatsController],
})
export class StatsModule {}
