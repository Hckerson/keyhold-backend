import { Module } from '@nestjs/common';
import { KycService } from './kyc.service';
import { KycController } from './kyc.controller';
import { ServicesModule } from '@common/services/services.module';

@Module({
    imports: [ServicesModule],
    providers: [KycService],
    controllers: [KycController],
})
export class KycModule {}
