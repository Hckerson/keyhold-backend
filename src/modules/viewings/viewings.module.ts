import { Module } from '@nestjs/common';
import { ViewingsService } from './viewings.service';
import { ViewingsController } from './viewings.controller';
import { ServicesModule } from '@common/services/services.module';

@Module({
    imports: [ServicesModule],
    providers: [ViewingsService],
    controllers: [ViewingsController],
})
export class ViewingsModule {}
