import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { ServicesModule } from '@common/services/services.module';

@Module({
    imports: [NotificationsModule, ServicesModule],
    providers: [MessagesService],
    controllers: [MessagesController],
})
export class MessagesModule {}
