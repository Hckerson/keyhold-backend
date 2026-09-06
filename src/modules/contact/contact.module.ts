import { Module } from '@nestjs/common';
import { ContactService } from './contact.service';
import { ContactController } from './contact.controller';
import { TwilioWebhookController } from './twilio-webhook.controller';
import { ServicesModule } from '@common/services/services.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';

@Module({
    imports: [ServicesModule, NotificationsModule],
    providers: [ContactService],
    controllers: [ContactController, TwilioWebhookController],
})
export class ContactModule {}
