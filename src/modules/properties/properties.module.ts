import { Module } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { ServicesModule } from '@common/services/services.module';
import { FlagsModule } from '@modules/flags/flags.module';
import { PrismaModule } from '@common/database/prisma.module';

@Module({
    imports: [ServicesModule, PrismaModule, FlagsModule],
    providers: [PropertiesService],
    controllers: [PropertiesController],
})
export class PropertiesModule {}
