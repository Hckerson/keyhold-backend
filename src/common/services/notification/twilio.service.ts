import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio, { Twilio } from 'twilio';

interface SMSResponse {
    success: boolean;
    messageId: string;
}

@Injectable()
export class TwilioService {
    private client: Twilio;

    constructor(private configService: ConfigService) {
        const accountSid = this.configService.get<string>(
            'externalServices.twilio.accountSid',
        );
        const authToken = this.configService.get<string>(
            'externalServices.twilio.authToken',
        );

        if (!accountSid || !authToken) {
            throw new Error('Twilio credentials not configured');
        }

        this.client = twilio(accountSid, authToken);
    }

    async sendSMS(toNumber: string, message: string): Promise<SMSResponse> {
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
