import { Module } from '@nestjs/common';
import { OffersService } from './offers.service';
import { OffersController } from './offers.controller';
import { ServicesModule } from '@common/services/services.module';

@Module({
    imports: [ServicesModule],
    providers: [OffersService],
    controllers: [OffersController],
})
export class OffersModule {}
