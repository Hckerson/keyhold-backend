import { Module } from '@nestjs/common';
import { StatsService } from '@common/services/stats/stats.service';
import { StatsController } from './stats.controller';

@Module({
    providers: [StatsService],
    controllers: [StatsController],
})
export class StatsModule {}
