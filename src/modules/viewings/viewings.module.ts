import { Module } from '@nestjs/common';
import { ViewingsService } from './viewings.service';
import { ViewingsController } from './viewings.controller';
import { ServicesModule } from '@common/services/services.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';

@Module({
    imports: [ServicesModule, NotificationsModule],
    providers: [ViewingsService],
    controllers: [ViewingsController],
})
export class ViewingsModule {}
