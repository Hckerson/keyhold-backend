import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio, { Twilio } from 'twilio';

interface SMSResponse {
    success: boolean;
    messageId: string;
}

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
}
