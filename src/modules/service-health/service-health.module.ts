import { Module } from '@nestjs/common';
import { ServiceHealthService } from './service-health.service';
import { ServiceHealthController } from './service-health.controller';

@Module({
    providers: [ServiceHealthService],
    controllers: [ServiceHealthController],
})
export class ServiceHealthModule {}
