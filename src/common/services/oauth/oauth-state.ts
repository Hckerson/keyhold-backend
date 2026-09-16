import { createHmac, timingSafeEqual } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { AuthProvider, UserRole } from '@generated/prisma/enums';
import { OAUTH_STATE_TTL_MS } from '@common/enums';
import { privateKeyFrom } from '@common/config/jwt-keys';

const SEPARATOR = '.';
const SIGNING_CONTEXT = 'oauth-state:';

export const oauthStateSchema = z.object({
    state: z.string().min(1),
    nonce: z.string().min(1),
    verifier: z.string().min(1),
    provider: z.enum(AuthProvider),
    purpose: z.enum(['signin', 'calendar']),
    redirect: z.string().optional(),
    role: z.enum(UserRole).optional(),
    userId: z.string().optional(),
    expiresAt: z.number().int(),
});

export type OAuthState = z.infer<typeof oauthStateSchema>;
export type OAuthStateInput = Omit<OAuthState, 'expiresAt'>;

const safeEqual = (left: string, right: string): boolean => {
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return a.length === b.length && timingSafeEqual(a, b);
};

const parseJson = (text: string): unknown => {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
};

@Injectable()
export class OAuthStateCodec {
    private readonly secret: string;

    constructor(configService: ConfigService) {
        this.secret = privateKeyFrom(configService);
    }

    seal(input: OAuthStateInput): string {
        const body = Buffer.from(
            JSON.stringify({
                ...input,
                expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
            }),
        ).toString('base64url');

        return `${body}${SEPARATOR}${this.sign(body)}`;
    }

    open(
        sealed: string | null,
        returnedState: string | undefined,
    ): OAuthState | null {
        if (!sealed || !returnedState) return null;

        const [body, signature, ...rest] = sealed.split(SEPARATOR);
        if (body === undefined || signature === undefined || rest.length > 0)
            return null;
        if (!safeEqual(signature, this.sign(body))) return null;

        const parsed = oauthStateSchema.safeParse(
            parseJson(Buffer.from(body, 'base64url').toString('utf8')),
        );
        if (!parsed.success) return null;
        if (parsed.data.expiresAt <= Date.now()) return null;
        if (!safeEqual(parsed.data.state, returnedState)) return null;

        return parsed.data;
    }

    private sign(body: string): string {
        return createHmac('sha256', this.secret)
            .update(`${SIGNING_CONTEXT}${body}`)
            .digest('base64url');
    }
}
