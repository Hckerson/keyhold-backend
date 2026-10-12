import { Test } from '@nestjs/testing';
import { StripeService } from './payment/stripe.service';
import { EmailService } from './email/email.service';
import { CloudinaryService } from './storage/cloudinary.service';
import { TwilioService } from './notification/twilio.service';
import { IntegrationStatusService } from './integration-status.service';

describe('IntegrationStatusService.findAll', () => {
    const rowsFor = async (state: {
        stripe?: boolean;
        webhooks?: boolean;
        smtp?: boolean;
        cloudinary?: boolean;
        twilio?: boolean;
    }) => {
        const moduleRef = await Test.createTestingModule({
            providers: [
                IntegrationStatusService,
                {
                    provide: StripeService,
                    useValue: {
                        configured: state.stripe ?? false,
                        webhooksConfigured: state.webhooks ?? false,
                    },
                },
                {
                    provide: EmailService,
                    useValue: { configured: state.smtp ?? false },
                },
                {
                    provide: CloudinaryService,
                    useValue: { configured: state.cloudinary ?? false },
                },
                {
                    provide: TwilioService,
                    useValue: { configured: state.twilio ?? false },
                },
            ],
        }).compile();

        return moduleRef.get(IntegrationStatusService).findAll();
    };

    it('reports each integration as configured only when its own service is', async () => {
        const rows = await rowsFor({ stripe: true, smtp: true });

        expect(
            rows.filter((row) => row.configured).map((row) => row.id),
        ).toEqual(['stripe', 'smtp']);
    });

    it('marks every integration except SMS as required', async () => {
        const rows = await rowsFor({});

        expect(
            rows.filter((row) => !row.required).map((row) => row.id),
        ).toEqual(['twilio']);
    });

    it('reports the webhook separately from the payment key', async () => {
        const rows = await rowsFor({ stripe: true, webhooks: false });

        expect(rows.find((row) => row.id === 'stripeWebhook')).toMatchObject({
            configured: false,
            required: true,
        });
    });
});
