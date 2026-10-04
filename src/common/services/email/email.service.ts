import { createTransport, type Transporter } from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SMTP_SECURE_PORT } from '@common/enums';

interface EmailOptions {
    to: string | string[];
    subject: string;
    replyTo?: string;
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

const HTML_ESCAPES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);

const toParagraphs = (body: string) =>
    body
        .split(/\n{2,}/)
        .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br />')}</p>`)
        .join('');

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private readonly transporter: Transporter | null;

    constructor(private configService: ConfigService) {
        const host = this.configService.get<string>(
            'externalServices.smtp.host',
        );
        const user = this.configService.get<string>(
            'externalServices.smtp.user',
        );
        const password = this.configService.get<string>(
            'externalServices.smtp.password',
        );
        const port =
            this.configService.get<number>('externalServices.smtp.port') ??
            SMTP_SECURE_PORT;

        if (!host || !user || !password) {
            this.transporter = null;
            this.logger.warn(
                'SMTP credentials not configured — outbound email is disabled',
            );
            return;
        }

        this.transporter = createTransport({
            host,
            port,
            secure: port === SMTP_SECURE_PORT,
            auth: { user, pass: password },
        });
    }

    get configured(): boolean {
        return this.transporter !== null;
    }

    async sendEmail(options: EmailOptions): Promise<EmailResponse> {
        if (!this.transporter) {
            this.logger.warn(
                `Email suppressed (SMTP disabled): "${options.subject}"`,
            );
            return { success: false };
        }

        try {
            const fromEmail = this.configService.get<string>(
                'externalServices.smtp.fromEmail',
            );

            if (!fromEmail) {
                throw new BadRequestException('Sender email is not configured');
            }
            await this.transporter.sendMail({
                to: options.to,
                from: fromEmail,
                replyTo: options.replyTo,
                subject: options.subject,
                html: options.html || options.text || options.subject,
                attachments: options.attachments?.map((att) => ({
                    filename: att.filename,
                    content: att.content,
                    contentType: att.type,
                    encoding: 'base64',
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

    async sendAgentOutreach(params: {
        to: string;
        replyTo: string;
        subject: string;
        body: string;
        agentName: string;
        propertyTitle: string;
    }): Promise<EmailResponse> {
        return this.sendEmail({
            to: params.to,
            replyTo: params.replyTo,
            subject: params.subject,
            html: `
        ${toParagraphs(params.body)}
        <hr />
        <p>${escapeHtml(params.agentName)} — regarding ${escapeHtml(params.propertyTitle)}</p>
        <p>Reply to this email to reach them directly.</p>
      `,
        });
    }

    async sendEmailVerificationEmail(
        email: string,
        fullName: string,
        code: string,
    ): Promise<EmailResponse> {
        return this.sendEmail({
            to: email,
            subject: 'Confirm your email address',
            html: `
    <h2>Confirm your email</h2>
    <p>Hello ${escapeHtml(fullName)},</p>
    <p>Your verification code is below. It expires in fifteen minutes.</p>
    <p style="font-size:24px;letter-spacing:4px;font-weight:600">${escapeHtml(code)}</p>
    <p>If you did not create an account, you can safely ignore this email.</p>
  `,
        });
    }

    async sendNewsletterConfirmation(params: {
        to: string;
        confirmUrl: string;
        unsubscribeUrl: string;
    }): Promise<EmailResponse> {
        return this.sendEmail({
            to: params.to,
            subject: 'Confirm your newsletter subscription',
            html: `
        <h2>Confirm your subscription</h2>
        <p>Someone, hopefully you, asked to receive our off-market notes at this address: occasional short notes on homes and neighbourhoods. Nothing is sent until you confirm.</p>
        <p><a href="${escapeHtml(params.confirmUrl)}">Confirm my subscription</a> — this link expires in three days.</p>
        <p>If you did not ask for this, ignore this email and you will hear nothing further.</p>
        <hr />
        <p>You can leave the list at any time: <a href="${escapeHtml(params.unsubscribeUrl)}">unsubscribe</a>.</p>
      `,
        });
    }

    async sendPasswordResetEmail(
        email: string,
        fullName: string,
        resetUrl: string,
    ): Promise<EmailResponse> {
        return this.sendEmail({
            to: email,
            subject: 'Reset your password',
            html: `
        <h2>Password reset</h2>
        <p>Hello ${fullName},</p>
        <p>We received a request to reset your password. This link expires in one hour.</p>
        <p><a href="${resetUrl}">Choose a new password</a></p>
        <p>If you did not request this, you can safely ignore this email.</p>
      `,
        });
    }
}
