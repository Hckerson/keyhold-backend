import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { ServicesModule } from '@common/services/services.module';
import { EscrowModule } from '@modules/escrow/escrow.module';
import { SettingsModule } from '@modules/settings/settings.module';

@Module({
    imports: [ServicesModule, EscrowModule, SettingsModule],
    providers: [TransactionsService],
    controllers: [TransactionsController, StripeWebhookController],
})
export class TransactionsModule {}
