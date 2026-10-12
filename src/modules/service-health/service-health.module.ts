import { Module } from '@nestjs/common';
import { ServicesModule } from '@common/services/services.module';
import { ServiceHealthService } from './service-health.service';
import { ServiceHealthController } from './service-health.controller';

@Module({
    imports: [ServicesModule],
    providers: [ServiceHealthService],
    controllers: [ServiceHealthController],
})
export class ServiceHealthModule {}
