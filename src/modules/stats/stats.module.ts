import { Module } from '@nestjs/common';
import { StatsService } from '@common/services/stats/stats.service';
import { SuspensionsModule } from '@modules/suspensions/suspensions.module';
import { StatsController } from './stats.controller';
import { UserGrowthService } from './user-growth.service';

@Module({
    imports: [SuspensionsModule],
    providers: [StatsService, UserGrowthService],
    controllers: [StatsController],
})
export class StatsModule {}
