import { Module } from '@nestjs/common';
import { EscrowService } from './escrow.service';
import { EscrowController } from './escrow.controller';
import { ServicesModule } from '@common/services/services.module';
import { SettingsModule } from '@modules/settings/settings.module';

@Module({
    imports: [ServicesModule, SettingsModule],
    providers: [EscrowService],
    controllers: [EscrowController],
    exports: [EscrowService],
})
export class EscrowModule {}
