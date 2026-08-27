import {
    Injectable,
    BadRequestException,
    Logger,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
    CENTS_PER_UNIT,
    DEFAULT_CURRENCY,
    ZERO_DECIMAL_CURRENCIES,
} from '@common/enums';

const STRIPE_API_VERSION: Stripe.LatestApiVersion = '2023-10-16';

interface PaymentIntentResponse {
    success: boolean;
    paymentIntent: Stripe.PaymentIntent;
}

const smallestUnit = (amount: number, currency: string): number =>
    ZERO_DECIMAL_CURRENCIES.includes(currency.toLowerCase())
        ? Math.round(amount)
        : Math.round(amount * CENTS_PER_UNIT);

@Injectable()
export class StripeService {
    private readonly logger = new Logger(StripeService.name);
    private readonly client: Stripe | null;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>(
            'externalServices.stripe.apiKey',
        );
        this.client = apiKey
            ? new Stripe(apiKey, { apiVersion: STRIPE_API_VERSION })
            : null;

        if (!this.client) {
            this.logger.warn(
                'STRIPE_API_KEY not configured — payment processing is disabled',
            );
        }
    }

    private get stripe(): Stripe {
        if (!this.client) {
            throw new ServiceUnavailableException(
                'Payment processing is not configured on this environment',
            );
        }
        return this.client;
    }

    async createPaymentIntent(
        amount: number,
        currency: string = DEFAULT_CURRENCY,
        metadata: Record<string, string> = {},
        idempotencyKey?: string,
    ): Promise<Stripe.PaymentIntent> {
        try {
            return await this.stripe.paymentIntents.create(
                {
                    amount: smallestUnit(amount, currency),
                    currency,
                    metadata,
                },
                idempotencyKey ? { idempotencyKey } : undefined,
            );
        } catch (error: unknown) {
            throw new BadRequestException(
                `Failed to create payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    async confirmPayment(
        paymentIntentId: string,
    ): Promise<PaymentIntentResponse> {
        try {
            const paymentIntent =
                await this.stripe.paymentIntents.retrieve(paymentIntentId);

            if (paymentIntent.status === 'succeeded') {
                return { success: true, paymentIntent };
            } else if (paymentIntent.status === 'requires_payment_method') {
                throw new BadRequestException('Payment method required');
            } else {
                throw new BadRequestException(
                    `Payment status: ${paymentIntent.status}`,
                );
            }
        } catch (error: unknown) {
            throw new BadRequestException(
                `Payment confirmation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    async refundPayment(
        paymentIntentId: string,
        reason?: string,
    ): Promise<Stripe.Refund> {
        try {
            return await this.stripe.refunds.create({
                payment_intent: paymentIntentId,
                reason:
                    (reason as Stripe.RefundCreateParams.Reason) || undefined,
            });
        } catch (error: unknown) {
            throw new BadRequestException(
                `Refund failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    constructEvent(payload: Buffer, signature: string): Stripe.Event {
        const secret = this.configService.get<string>(
            'externalServices.stripe.webhookSecret',
        );
        if (!secret) {
            throw new ServiceUnavailableException(
                'Payment webhooks are not configured on this environment',
            );
        }

        try {
            return this.stripe.webhooks.constructEvent(
                payload,
                signature,
                secret,
            );
        } catch (error: unknown) {
            throw new BadRequestException(
                `Webhook signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    async getPaymentIntent(
        paymentIntentId: string,
    ): Promise<Stripe.PaymentIntent> {
        try {
            return await this.stripe.paymentIntents.retrieve(paymentIntentId);
        } catch (error: unknown) {
            throw new BadRequestException(
                `Failed to retrieve payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }
}
