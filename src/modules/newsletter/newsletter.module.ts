import { Module } from '@nestjs/common';
import { ServicesModule } from '@common/services/services.module';
import { NewsletterService } from './newsletter.service';
import { NewsletterController } from './newsletter.controller';

@Module({
    imports: [ServicesModule],
    providers: [NewsletterService],
    controllers: [NewsletterController],
})
export class NewsletterModule {}
