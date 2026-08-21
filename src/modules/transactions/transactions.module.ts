import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { ServicesModule } from '@common/services/services.module';
import { EscrowModule } from '@modules/escrow/escrow.module';

@Module({
    imports: [ServicesModule, EscrowModule],
    providers: [TransactionsService],
    controllers: [TransactionsController],
})
export class TransactionsModule {}
