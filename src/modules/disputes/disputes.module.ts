import { Module } from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { DisputesController } from './disputes.controller';
import { EscrowModule } from '@modules/escrow/escrow.module';

@Module({
    imports: [EscrowModule],
    providers: [DisputesService],
    controllers: [DisputesController],
})
export class DisputesModule {}
