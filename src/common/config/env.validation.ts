import { z } from 'zod';
import {
    DEFAULT_FRONTEND_URL,
    DEFAULT_JWT_EXPIRATION,
    DEFAULT_PORT,
    E164_PATTERN,
    HOSTNAME_PATTERN,
    NodeEnv,
    SMTP_SECURE_PORT,
    TOKEN_KEY_BYTES,
} from '@common/enums';

interface CredentialGroup {
    service: string;
    keys: string[];
    companions: string[];
    requiredInProduction: boolean;
}

const CREDENTIAL_GROUPS: CredentialGroup[] = [
    {
        service: 'Stripe',
        keys: ['STRIPE_API_KEY', 'STRIPE_WEBHOOK_SECRET'],
        companions: [],
        requiredInProduction: true,
    },
    {
        service: 'SMTP',
        keys: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'],
        companions: ['EMAIL_FROM'],
        requiredInProduction: true,
    },
    {
        service: 'Cloudinary',
        keys: [
            'CLOUDINARY_CLOUD_NAME',
            'CLOUDINARY_API_KEY',
            'CLOUDINARY_API_SECRET',
        ],
        companions: [],
        requiredInProduction: true,
    },
    {
        service: 'Twilio',
        keys: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'],
        companions: [],
        requiredInProduction: false,
    },
    {
        service: 'Google sign-in',
        keys: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
        companions: ['API_PUBLIC_URL'],
        requiredInProduction: false,
    },
    {
        service: 'Facebook sign-in',
        keys: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET'],
        companions: ['API_PUBLIC_URL'],
        requiredInProduction: false,
    },
    {
        service: 'Google Calendar',
        keys: ['TOKEN_ENCRYPTION_KEY'],
        companions: [
            'GOOGLE_CLIENT_ID',
            'GOOGLE_CLIENT_SECRET',
            'API_PUBLIC_URL',
        ],
        requiredInProduction: false,
    },
];

const blankAsAbsent = (value: unknown): unknown =>
    typeof value === 'string' && value.trim() === '' ? undefined : value;

const optionalSecret = z.preprocess(
    blankAsAbsent,
    z.string().min(1).optional(),
);

const optionalEncryptionKey = z.preprocess(
    blankAsAbsent,
    z
        .string()
        .refine(
            (value) => Buffer.from(value, 'base64').length === TOKEN_KEY_BYTES,
            `TOKEN_ENCRYPTION_KEY must be ${TOKEN_KEY_BYTES} bytes, base64-encoded`,
        )
        .optional(),
);

const envSchema = z
    .object({
        DATABASE_URL: z.string().min(1),
        JWT_PRIVATE_KEY: z.string().min(1),
        JWT_PUBLIC_KEY: z.string().min(1),
        JWT_EXPIRATION: z.preprocess(
            blankAsAbsent,
            z.string().min(1).default(DEFAULT_JWT_EXPIRATION),
        ),
        NODE_ENV: z.preprocess(
            blankAsAbsent,
            z.enum(NodeEnv).default(NodeEnv.DEVELOPMENT),
        ),
        PORT: z.preprocess(
            blankAsAbsent,
            z.coerce.number().int().positive().default(DEFAULT_PORT),
        ),
        FRONTEND_URL: z.preprocess(
            blankAsAbsent,
            z.url().default(DEFAULT_FRONTEND_URL),
        ),
        COOKIE_DOMAIN: z.preprocess(
            blankAsAbsent,
            z
                .string()
                .regex(
                    HOSTNAME_PATTERN,
                    'must be a bare hostname such as keyhol.me, with no scheme, port or path',
                )
                .optional(),
        ),
        STRIPE_API_KEY: optionalSecret,
        STRIPE_WEBHOOK_SECRET: optionalSecret,
        SMTP_HOST: optionalSecret,
        SMTP_PORT: z.preprocess(
            blankAsAbsent,
            z.coerce.number().int().positive().default(SMTP_SECURE_PORT),
        ),
        SMTP_USER: optionalSecret,
        SMTP_PASSWORD: optionalSecret,
        EMAIL_FROM: z.preprocess(blankAsAbsent, z.email().optional()),
        CLOUDINARY_CLOUD_NAME: optionalSecret,
        CLOUDINARY_API_KEY: optionalSecret,
        CLOUDINARY_API_SECRET: optionalSecret,
        TWILIO_ACCOUNT_SID: optionalSecret,
        TWILIO_AUTH_TOKEN: optionalSecret,
        TWILIO_FROM_NUMBER: z.preprocess(
            blankAsAbsent,
            z.string().regex(E164_PATTERN).optional(),
        ),
        SENTRY_DSN: z.preprocess(blankAsAbsent, z.url().optional()),
        SENTRY_TRACES_SAMPLE_RATE: z.preprocess(
            blankAsAbsent,
            z.coerce.number().min(0).max(1).optional(),
        ),
        TWILIO_STATUS_CALLBACK_URL: z.preprocess(
            blankAsAbsent,
            z.url().optional(),
        ),
        API_PUBLIC_URL: z.preprocess(blankAsAbsent, z.url().optional()),
        GOOGLE_CLIENT_ID: optionalSecret,
        GOOGLE_CLIENT_SECRET: optionalSecret,
        FACEBOOK_APP_ID: optionalSecret,
        FACEBOOK_APP_SECRET: optionalSecret,
        TOKEN_ENCRYPTION_KEY: optionalEncryptionKey,
    })
    .superRefine((env, ctx) => {
        const isProduction = env.NODE_ENV === NodeEnv.PRODUCTION;
        const absent = (key: string) =>
            env[key as keyof typeof env] === undefined;

        for (const group of CREDENTIAL_GROUPS) {
            const missingKeys = group.keys.filter(absent);
            const isActive = missingKeys.length < group.keys.length;

            if (!isActive) {
                if (isProduction && group.requiredInProduction) {
                    ctx.addIssue({
                        code: 'custom',
                        path: [group.keys[0]],
                        message: `${group.service} must be configured when NODE_ENV is production`,
                    });
                }
                continue;
            }

            const missing = [
                ...missingKeys,
                ...group.companions.filter(absent),
            ];
            if (missing.length > 0) {
                ctx.addIssue({
                    code: 'custom',
                    path: [missing[0]],
                    message: `${group.service} is partially configured — missing ${missing.join(', ')}. Set every value or leave them all empty`,
                });
            }
        }
    });

export const validateEnv = (
    config: Record<string, unknown>,
): Record<string, unknown> => {
    const parsed = envSchema.safeParse(config);

    if (!parsed.success) {
        const detail = parsed.error.issues
            .map((issue) => `  ${issue.path.join('.')} — ${issue.message}`)
            .join('\n');
        throw new Error(`Invalid environment configuration:\n${detail}`);
    }

    return { ...config, ...parsed.data };
};
