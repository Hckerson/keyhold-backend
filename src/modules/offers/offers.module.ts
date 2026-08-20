import { Module } from '@nestjs/common';
import { OffersService } from './offers.service';
import { OffersController } from './offers.controller';
import { ServicesModule } from '@common/services/services.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';

@Module({
    imports: [ServicesModule, NotificationsModule],
    providers: [OffersService],
    controllers: [OffersController],
})
export class OffersModule {}
