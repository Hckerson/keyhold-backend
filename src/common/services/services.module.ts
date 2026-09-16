import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeService } from './payment/stripe.service';
import { EmailService } from './email/email.service';
import { CloudinaryService } from './storage/cloudinary.service';
import { TwilioService } from './notification/twilio.service';
import { PDFService } from './document/pdf.service';
import { TokenCipher } from './crypto/token-cipher';
import { OAuthStateCodec } from './oauth/oauth-state';
import { GoogleOAuthClient } from './oauth/google-oauth.client';
import { FacebookOAuthClient } from './oauth/facebook-oauth.client';

@Module({
    imports: [ConfigModule],
    providers: [
        StripeService,
        EmailService,
        CloudinaryService,
        TwilioService,
        PDFService,
        TokenCipher,
        OAuthStateCodec,
        GoogleOAuthClient,
        FacebookOAuthClient,
    ],
    exports: [
        StripeService,
        EmailService,
        CloudinaryService,
        TwilioService,
        PDFService,
        TokenCipher,
        OAuthStateCodec,
        GoogleOAuthClient,
        FacebookOAuthClient,
    ],
})
export class ServicesModule {}
