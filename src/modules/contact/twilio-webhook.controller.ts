import {
    Body,
    Controller,
    Headers,
    HttpCode,
    HttpStatus,
    Post,
    UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { TwilioService } from '@common/services/notification/twilio.service';
import { ContactService } from './contact.service';

interface VoiceStatusPayload {
    CallSid?: string;
    CallStatus?: string;
    CallDuration?: string;
}

@Controller('webhooks')
@ApiExcludeController()
export class TwilioWebhookController {
    constructor(
        private readonly configService: ConfigService,
        private readonly twilioService: TwilioService,
        private readonly contactService: ContactService,
    ) {}

    @Post('twilio/voice-status')
    @HttpCode(HttpStatus.OK)
    async handleVoiceStatus(
        @Body() payload: VoiceStatusPayload,
        @Headers('x-twilio-signature') signature?: string,
    ) {
        const callbackUrl = this.configService.get<string>(
            'externalServices.twilio.statusCallbackUrl',
        );

        if (!signature || !callbackUrl) {
            throw new UnauthorizedException('Missing Twilio webhook payload');
        }

        const params = Object.fromEntries(
            Object.entries(payload).map(([key, value]) => [key, String(value)]),
        );

        if (
            !this.twilioService.verifyWebhookSignature(
                signature,
                callbackUrl,
                params,
            )
        ) {
            throw new UnauthorizedException('Invalid Twilio signature');
        }

        if (payload.CallSid && payload.CallStatus) {
            await this.contactService.recordCallStatus(
                payload.CallSid,
                payload.CallStatus,
                payload.CallDuration ? Number(payload.CallDuration) : undefined,
            );
        }

        return { received: true };
    }
}
