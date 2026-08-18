import {
    Injectable,
    BadRequestException,
    Logger,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

interface PaymentIntentResponse {
    success: boolean;
    paymentIntent: Stripe.PaymentIntent;
}

@Injectable()
export class StripeService {
    private readonly logger = new Logger(StripeService.name);
    private readonly client: Stripe | null;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>(
            'externalServices.stripe.apiKey',
        );
        this.client = apiKey ? new Stripe(apiKey) : null;

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
        currency: string = 'usd',
        metadata: Record<string, string> = {},
    ): Promise<Stripe.PaymentIntent> {
        try {
            return await this.stripe.paymentIntents.create({
                amount: Math.round(amount * 100),
                currency,
                metadata,
            });
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
