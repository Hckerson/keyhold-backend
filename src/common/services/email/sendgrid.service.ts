import * as sgMail from '@sendgrid/mail';
import { ConfigService } from '@nestjs/config';
import { Injectable, BadRequestException } from '@nestjs/common';

interface EmailOptions {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    attachments?: Array<{
        filename: string;
        content: string;
        type?: string;
    }>;
}

interface EmailResponse {
    success: boolean;
}

@Injectable()
export class SendGridEmailService {
    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>(
            'externalServices.sendgrid.apiKey',
        );
        if (!apiKey) throw new Error('SENDGRID_API_KEY not configured');
        sgMail.setApiKey(apiKey);
    }

    async sendEmail(options: EmailOptions): Promise<EmailResponse> {
        try {
            const fromEmail = this.configService.get<string>(
                'externalServices.sendgrid.fromEmail',
            );

            if (!fromEmail) {
                throw new BadRequestException(
                    'SendGrid from email is not configured',
                );
            }
            await sgMail.send({
                to: options.to,
                from: fromEmail,
                subject: options.subject,
                html: options.html || options.text || options.subject,
                attachments: options.attachments?.map((att) => ({
                    filename: att.filename,
                    content: att.content,
                    type: att.type,
                    disposition: 'attachment',
                })),
            });
            return { success: true };
        } catch (error: unknown) {
            throw new BadRequestException(
                `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    async sendConnectionNotification(
        buyerEmail: string,
        propertyTitle: string,
        sellerName: string,
    ): Promise<EmailResponse> {
        return this.sendEmail({
            to: buyerEmail,
            subject: `New Connection: ${propertyTitle}`,
            html: `
        <h2>Connection Accepted!</h2>
        <p>Great news! ${sellerName} has accepted your interest in ${propertyTitle}.</p>
        <p>You can now message them to schedule a viewing or ask questions.</p>
      `,
        });
    }

    async sendViewingRequestNotification(
        sellerEmail: string,
        buyerName: string,
        propertyTitle: string,
    ): Promise<EmailResponse> {
        return this.sendEmail({
            to: sellerEmail,
            subject: `Viewing Request: ${propertyTitle}`,
            html: `
        <h2>New Viewing Request</h2>
        <p>${buyerName} is interested in viewing ${propertyTitle}.</p>
        <p>Check your messages to propose viewing times.</p>
      `,
        });
    }

    async sendOfferNotification(
        sellerEmail: string,
        buyerName: string,
        propertyTitle: string,
        offeredPrice: number,
    ): Promise<EmailResponse> {
        return this.sendEmail({
            to: sellerEmail,
            subject: `New Offer: ${propertyTitle}`,
            html: `
        <h2>New Purchase Offer</h2>
        <p>${buyerName} has made an offer on ${propertyTitle}.</p>
        <p><strong>Offered Price: $${offeredPrice.toLocaleString()}</strong></p>
        <p>Review and respond to the offer in your dashboard.</p>
      `,
        });
    }

    async sendTransactionCompletedEmail(
        buyerEmail: string,
        propertyTitle: string,
        finalPrice: number,
    ): Promise<EmailResponse> {
        return this.sendEmail({
            to: buyerEmail,
            subject: `Purchase Completed: ${propertyTitle}`,
            html: `
        <h2>Congratulations!</h2>
        <p>Your purchase of ${propertyTitle} is complete.</p>
        <p><strong>Final Price: $${finalPrice.toLocaleString()}</strong></p>
        <p>Thank you for using our platform. Please rate the seller.</p>
      `,
        });
    }
}
