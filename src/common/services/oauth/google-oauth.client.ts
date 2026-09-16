import { createPublicKey, createVerify } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { AuthProvider } from '@generated/prisma/enums';
import type { AuthorizeRequest, OAuthProfile } from './oauth.types';

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const SIGNIN_SCOPES = ['openid', 'email', 'profile'];
const JWKS_TTL_MS = 60 * 60 * 1000;
const MS_PER_SECOND = 1000;
const FORM_HEADERS = { 'Content-Type': 'application/x-www-form-urlencoded' };
const FALLBACK_NAME = 'Google member';

export const CALENDAR_SCOPES = [
    'openid',
    'email',
    'https://www.googleapis.com/auth/calendar.events',
];

const tokenResponseSchema = z.object({
    access_token: z.string().min(1),
    id_token: z.string().min(1).optional(),
    refresh_token: z.string().min(1).optional(),
});

const signingKeySchema = z.object({
    kid: z.string(),
    kty: z.literal('RSA'),
    n: z.string(),
    e: z.string(),
});

const jwksSchema = z.object({ keys: z.array(signingKeySchema) });

const headerSchema = z.object({ alg: z.literal('RS256'), kid: z.string() });

const claimsSchema = z.object({
    iss: z.string(),
    aud: z.string(),
    sub: z.string().min(1),
    exp: z.number(),
    nonce: z.string().optional(),
    email: z.string().optional(),
    email_verified: z
        .union([z.boolean(), z.enum(['true', 'false'])])
        .optional(),
    name: z.string().optional(),
});

export type GoogleTokens = z.infer<typeof tokenResponseSchema>;
type SigningKey = z.infer<typeof signingKeySchema>;
type GoogleClaims = z.infer<typeof claimsSchema>;

export class GoogleTokenError extends Error {
    constructor(
        message: string,
        readonly status?: number,
    ) {
        super(message);
    }
}

const decodeSegment = (segment: string): unknown => {
    try {
        return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
    } catch {
        return null;
    }
};

@Injectable()
export class GoogleOAuthClient {
    private readonly logger = new Logger(GoogleOAuthClient.name);
    private readonly clientId?: string;
    private readonly clientSecret?: string;
    private readonly apiBase?: string;
    private keyCache: { keys: SigningKey[]; fetchedAt: number } | null = null;

    constructor(configService: ConfigService) {
        this.clientId = configService.get<string>(
            'externalServices.oauth.google.clientId',
        );
        this.clientSecret = configService.get<string>(
            'externalServices.oauth.google.clientSecret',
        );
        this.apiBase = configService.get<string>(
            'externalServices.oauth.apiPublicUrl',
        );

        if (!this.enabled) {
            this.logger.warn(
                'Google OAuth not configured — Google sign-in and Calendar sync are disabled',
            );
        }
    }

    get enabled(): boolean {
        return Boolean(this.clientId && this.clientSecret && this.apiBase);
    }

    authorizeUrl(
        callbackPath: string,
        request: AuthorizeRequest,
        scopes: string[] = SIGNIN_SCOPES,
        offline = false,
    ): string {
        const { clientId, apiBase } = this.credentials();
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: `${apiBase}${callbackPath}`,
            response_type: 'code',
            scope: scopes.join(' '),
            state: request.state,
            nonce: request.nonce,
            code_challenge: request.challenge,
            code_challenge_method: 'S256',
            ...(offline
                ? { access_type: 'offline', prompt: 'consent' }
                : { prompt: 'select_account' }),
        });

        return `${AUTHORIZE_URL}?${params.toString()}`;
    }

    exchange(
        callbackPath: string,
        code: string,
        verifier: string,
    ): Promise<GoogleTokens> {
        const { clientId, clientSecret, apiBase } = this.credentials();
        return this.postToken({
            grant_type: 'authorization_code',
            code,
            code_verifier: verifier,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: `${apiBase}${callbackPath}`,
        });
    }

    async refresh(refreshToken: string): Promise<string> {
        const { clientId, clientSecret } = this.credentials();
        const tokens = await this.postToken({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
        });
        return tokens.access_token;
    }

    async revoke(token: string): Promise<void> {
        await fetch(REVOKE_URL, {
            method: 'POST',
            headers: FORM_HEADERS,
            body: new URLSearchParams({ token }),
        });
    }

    async profileFrom(
        idToken: string,
        expectedNonce: string,
    ): Promise<OAuthProfile> {
        const claims = await this.verifyIdToken(idToken, expectedNonce);
        return {
            provider: AuthProvider.GOOGLE,
            providerUserId: claims.sub,
            email: claims.email?.toLowerCase() ?? null,
            emailVerified:
                claims.email_verified === true ||
                claims.email_verified === 'true',
            fullName: claims.name ?? claims.email ?? FALLBACK_NAME,
        };
    }

    async verifyIdToken(
        idToken: string,
        expectedNonce: string,
    ): Promise<GoogleClaims> {
        const [headerPart, payloadPart, signaturePart, ...rest] =
            idToken.split('.');
        if (
            headerPart === undefined ||
            payloadPart === undefined ||
            signaturePart === undefined ||
            rest.length > 0
        ) {
            throw new GoogleTokenError('Malformed id_token');
        }

        const header = headerSchema.safeParse(decodeSegment(headerPart));
        if (!header.success) {
            throw new GoogleTokenError('Unsupported id_token header');
        }

        const jwk = await this.signingKey(header.data.kid);
        const verified = createVerify('RSA-SHA256')
            .update(`${headerPart}.${payloadPart}`)
            .verify(
                createPublicKey({
                    key: { kty: jwk.kty, n: jwk.n, e: jwk.e },
                    format: 'jwk',
                }),
                Buffer.from(signaturePart, 'base64url'),
            );
        if (!verified) throw new GoogleTokenError('Invalid id_token signature');

        const claims = claimsSchema.safeParse(decodeSegment(payloadPart));
        if (!claims.success) {
            throw new GoogleTokenError('Malformed id_token claims');
        }
        if (!ISSUERS.includes(claims.data.iss)) {
            throw new GoogleTokenError('Unexpected id_token issuer');
        }
        if (claims.data.aud !== this.credentials().clientId) {
            throw new GoogleTokenError(
                'id_token was not issued for this client',
            );
        }
        if (claims.data.exp * MS_PER_SECOND <= Date.now()) {
            throw new GoogleTokenError('id_token has expired');
        }
        if (claims.data.nonce !== expectedNonce) {
            throw new GoogleTokenError('id_token nonce mismatch');
        }

        return claims.data;
    }

    private async signingKey(kid: string): Promise<SigningKey> {
        const fresh =
            this.keyCache && Date.now() - this.keyCache.fetchedAt < JWKS_TTL_MS;
        const cached = fresh
            ? this.keyCache?.keys.find((key) => key.kid === kid)
            : undefined;
        if (cached) return cached;

        const response = await fetch(JWKS_URL);
        if (!response.ok) {
            throw new GoogleTokenError(
                'Could not load Google signing keys',
                response.status,
            );
        }
        const { keys } = jwksSchema.parse(await response.json());
        this.keyCache = { keys, fetchedAt: Date.now() };

        const key = keys.find((candidate) => candidate.kid === kid);
        if (!key) throw new GoogleTokenError('Unknown id_token signing key');
        return key;
    }

    private async postToken(
        body: Record<string, string>,
    ): Promise<GoogleTokens> {
        const response = await fetch(TOKEN_URL, {
            method: 'POST',
            headers: FORM_HEADERS,
            body: new URLSearchParams(body),
        });
        if (!response.ok) {
            throw new GoogleTokenError(
                `Google token endpoint returned ${response.status}`,
                response.status,
            );
        }
        return tokenResponseSchema.parse(await response.json());
    }

    private credentials() {
        if (!this.clientId || !this.clientSecret || !this.apiBase) {
            throw new GoogleTokenError('Google OAuth is not configured');
        }
        return {
            clientId: this.clientId,
            clientSecret: this.clientSecret,
            apiBase: this.apiBase,
        };
    }
}
