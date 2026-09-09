import { registerAs } from '@nestjs/config';

export const externalServicesConfig = registerAs('externalServices', () => ({
    stripe: {
        apiKey: process.env.STRIPE_API_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    smtp: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
        user: process.env.SMTP_USER,
        password: process.env.SMTP_PASSWORD,
        fromEmail: process.env.EMAIL_FROM,
    },
    cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        fromNumber: process.env.TWILIO_FROM_NUMBER,
        statusCallbackUrl: process.env.TWILIO_STATUS_CALLBACK_URL,
    },
}));
