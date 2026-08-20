import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { NotificationsModule } from '@modules/notifications/notifications.module';

@Module({
    imports: [NotificationsModule],
    providers: [MessagesService],
    controllers: [MessagesController],
})
export class MessagesModule {}
