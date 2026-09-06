import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio, { Twilio, validateRequest } from 'twilio';

interface SMSResponse {
    success: boolean;
    messageId: string;
}

interface BridgedCallParams {
    agentPhone: string;
    leadPhone: string;
    announcement: string;
}

interface CallResponse {
    success: boolean;
    callSid: string;
}

const STATUS_CALLBACK_EVENTS = [
    'initiated',
    'ringing',
    'answered',
    'completed',
];

@Injectable()
export class TwilioService {
    private readonly logger = new Logger(TwilioService.name);
    private readonly client: Twilio | null;

    constructor(private configService: ConfigService) {
        const accountSid = this.configService.get<string>(
            'externalServices.twilio.accountSid',
        );
        const authToken = this.configService.get<string>(
            'externalServices.twilio.authToken',
        );

        this.client =
            accountSid && authToken ? twilio(accountSid, authToken) : null;

        if (!this.client) {
            this.logger.warn(
                'Twilio credentials not configured — outbound SMS is disabled',
            );
        }
    }

    async sendSMS(toNumber: string, message: string): Promise<SMSResponse> {
        if (!this.client) {
            this.logger.warn(`SMS suppressed (Twilio disabled) to ${toNumber}`);
            return { success: false, messageId: '' };
        }

        try {
            const fromNumber = this.configService.get<string>(
                'externalServices.twilio.fromNumber',
            );
            if (!fromNumber)
                throw new Error('Twilio from number not configured');

            const result = await this.client.messages.create({
                body: message,
                from: fromNumber,
                to: toNumber,
            });

            return { success: true, messageId: result.sid };
        } catch (error: unknown) {
            throw new BadRequestException(
                `Failed to send SMS: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    async sendViewingReminder(
        phoneNumber: string,
        propertyTitle: string,
        time: string,
    ): Promise<SMSResponse> {
        const message = `Reminder: You have a viewing scheduled for ${propertyTitle} at ${time}. Reply CONFIRM to confirm attendance.`;
        return this.sendSMS(phoneNumber, message);
    }

    async sendConnectionNotificationSMS(
        phoneNumber: string,
        propertyTitle: string,
    ): Promise<SMSResponse> {
        const message = `Good news! Someone is interested in your property: ${propertyTitle}. Check the app for details.`;
        return this.sendSMS(phoneNumber, message);
    }

    async sendOfferNotificationSMS(
        phoneNumber: string,
        offerAmount: number,
    ): Promise<SMSResponse> {
        const message = `You've received a new offer of $${offerAmount.toLocaleString()}. Check your app for details.`;
        return this.sendSMS(phoneNumber, message);
    }

    get voiceEnabled(): boolean {
        return Boolean(
            this.client &&
            this.configService.get<string>(
                'externalServices.twilio.fromNumber',
            ),
        );
    }

    async createBridgedCall(params: BridgedCallParams): Promise<CallResponse> {
        const fromNumber = this.configService.get<string>(
            'externalServices.twilio.fromNumber',
        );

        if (!this.client || !fromNumber) {
            throw new BadRequestException(
                'Calling is not configured on this environment',
            );
        }

        const response = new twilio.twiml.VoiceResponse();
        response.say(params.announcement);
        response
            .dial({ callerId: fromNumber, answerOnBridge: true })
            .number(params.leadPhone);

        const statusCallback = this.configService.get<string>(
            'externalServices.twilio.statusCallbackUrl',
        );

        try {
            const call = await this.client.calls.create({
                to: params.agentPhone,
                from: fromNumber,
                twiml: response.toString(),
                ...(statusCallback
                    ? {
                          statusCallback,
                          statusCallbackEvent: STATUS_CALLBACK_EVENTS,
                          statusCallbackMethod: 'POST',
                      }
                    : {}),
            });

            return { success: true, callSid: call.sid };
        } catch (error: unknown) {
            throw new BadRequestException(
                `Failed to place call: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    verifyWebhookSignature(
        signature: string,
        url: string,
        params: Record<string, string>,
    ): boolean {
        const authToken = this.configService.get<string>(
            'externalServices.twilio.authToken',
        );
        if (!authToken) return false;

        return validateRequest(authToken, signature, url, params);
    }
}
