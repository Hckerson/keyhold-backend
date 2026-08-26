import {
    Controller,
    Headers,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { StripeService } from '@common/services/payment/stripe.service';
import { TransactionsService } from './transactions.service';

@Controller('webhooks')
@ApiExcludeController()
export class StripeWebhookController {
    constructor(
        private readonly stripeService: StripeService,
        private readonly transactionsService: TransactionsService,
    ) {}

    @Post('stripe')
    @HttpCode(HttpStatus.OK)
    async handleStripe(
        @Req() request: RawBodyRequest<Request>,
        @Headers('stripe-signature') signature?: string,
    ) {
        if (!signature || !request.rawBody) {
            throw new UnauthorizedException('Missing Stripe webhook payload');
        }

        const event = this.stripeService.constructEvent(
            request.rawBody,
            signature,
        );

        if (event.type === 'payment_intent.succeeded') {
            const intent = event.data.object;
            await this.transactionsService.settleFromStripe(intent.id);
        }

        return { received: true };
    }
}
