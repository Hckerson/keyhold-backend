import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeService } from './payment/stripe.service';
import { EmailService } from './email/email.service';
import { CloudinaryService } from './storage/cloudinary.service';
import { TwilioService } from './notification/twilio.service';
import { PDFService } from './document/pdf.service';

@Module({
    imports: [ConfigModule],
    providers: [
        StripeService,
        EmailService,
        CloudinaryService,
        TwilioService,
        PDFService,
    ],
    exports: [
        StripeService,
        EmailService,
        CloudinaryService,
        TwilioService,
        PDFService,
    ],
})
export class ServicesModule {}
