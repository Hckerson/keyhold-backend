import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { ServicesModule } from '@common/services/services.module';

@Module({
    imports: [ServicesModule],
    providers: [TransactionsService],
    controllers: [TransactionsController],
})
export class TransactionsModule {}
