import { createSign, generateKeyPairSync, type KeyObject } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { AuthProvider } from '@generated/prisma/enums';
import { GoogleOAuthClient, GoogleTokenError } from './google-oauth.client';

const CLIENT_ID = 'client-123.apps.googleusercontent.com';
const KID = 'signing-key-1';
const NONCE = 'expected-nonce';
const MS_PER_SECOND = 1000;
const HOUR_SECONDS = 3600;
const MODULUS_LENGTH = 2048;

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: MODULUS_LENGTH,
});
const { privateKey: strangerKey } = generateKeyPairSync('rsa', {
    modulusLength: MODULUS_LENGTH,
});
const publishedKey = { ...publicKey.export({ format: 'jwk' }), kid: KID };

const segment = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');

const signToken = (claims: object, key: KeyObject = privateKey) => {
    const header = segment({ alg: 'RS256', kid: KID });
    const body = segment(claims);
    const signature = createSign('RSA-SHA256')
        .update(`${header}.${body}`)
        .sign(key)
        .toString('base64url');
    return `${header}.${body}.${signature}`;
};

const nowSeconds = () => Math.floor(Date.now() / MS_PER_SECOND);

const validClaims = () => ({
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    sub: 'google-user-1',
    exp: nowSeconds() + HOUR_SECONDS,
    nonce: NONCE,
    email: 'Ada@Example.com',
    email_verified: true,
    name: 'Ada Lovelace',
});

describe('GoogleOAuthClient', () => {
    const client = new GoogleOAuthClient(
        new ConfigService({
            externalServices: {
                oauth: {
                    apiPublicUrl: 'https://api.example.com/api',
                    google: { clientId: CLIENT_ID, clientSecret: 'secret' },
                },
            },
        }),
    );

    beforeEach(() => {
        jest.spyOn(global, 'fetch').mockImplementation(() =>
            Promise.resolve(
                new Response(JSON.stringify({ keys: [publishedKey] })),
            ),
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('accepts a token Google signed for this client', async () => {
        await expect(
            client.profileFrom(signToken(validClaims()), NONCE),
        ).resolves.toEqual({
            provider: AuthProvider.GOOGLE,
            providerUserId: 'google-user-1',
            email: 'ada@example.com',
            emailVerified: true,
            fullName: 'Ada Lovelace',
        });
    });

    it.each([
        ['issued for another client', { aud: 'another-client' }],
        ['issued by another issuer', { iss: 'https://issuer.example.com' }],
        ['already expired', { exp: nowSeconds() - 1 }],
        ['carrying a replayed nonce', { nonce: 'replayed-nonce' }],
    ])('refuses a token %s', async (_label, override) => {
        await expect(
            client.verifyIdToken(
                signToken({ ...validClaims(), ...override }),
                NONCE,
            ),
        ).rejects.toThrow(GoogleTokenError);
    });

    it('refuses a token signed with a key Google never published', async () => {
        await expect(
            client.verifyIdToken(signToken(validClaims(), strangerKey), NONCE),
        ).rejects.toThrow('Invalid id_token signature');
    });

    it('does not treat an unverified email as verified', async () => {
        const profile = await client.profileFrom(
            signToken({ ...validClaims(), email_verified: false }),
            NONCE,
        );

        expect(profile.emailVerified).toBe(false);
    });
});
