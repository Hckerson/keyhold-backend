import { Injectable } from '@nestjs/common';
import { StripeService } from './payment/stripe.service';
import { EmailService } from './email/email.service';
import { CloudinaryService } from './storage/cloudinary.service';
import { TwilioService } from './notification/twilio.service';

export type IntegrationId =
    | 'stripe'
    | 'stripeWebhook'
    | 'smtp'
    | 'cloudinary'
    | 'twilio';

export interface IntegrationStatusRow {
    id: IntegrationId;
    label: string;
    capability: string;
    configured: boolean;
    required: boolean;
}

@Injectable()
export class IntegrationStatusService {
    constructor(
        private stripeService: StripeService,
        private emailService: EmailService,
        private cloudinaryService: CloudinaryService,
        private twilioService: TwilioService,
    ) {}

    findAll(): IntegrationStatusRow[] {
        return [
            {
                id: 'stripe',
                label: 'Stripe',
                capability: 'Card payments and refunds',
                configured: this.stripeService.configured,
                required: true,
            },
            {
                id: 'stripeWebhook',
                label: 'Stripe webhook',
                capability: 'Settlement that survives a closed browser',
                configured: this.stripeService.webhooksConfigured,
                required: true,
            },
            {
                id: 'smtp',
                label: 'SMTP',
                capability: 'Transactional email',
                configured: this.emailService.configured,
                required: true,
            },
            {
                id: 'cloudinary',
                label: 'Cloudinary',
                capability: 'Listing imagery and KYC documents',
                configured: this.cloudinaryService.configured,
                required: true,
            },
            {
                id: 'twilio',
                label: 'Twilio',
                capability: 'SMS alerts',
                configured: this.twilioService.configured,
                required: false,
            },
        ];
    }
}
