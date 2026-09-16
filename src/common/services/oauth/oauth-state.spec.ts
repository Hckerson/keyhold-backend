import { ConfigService } from '@nestjs/config';
import { AuthProvider } from '@generated/prisma/enums';
import { OAUTH_STATE_TTL_MS } from '@common/enums';
import { OAuthStateCodec, type OAuthStateInput } from './oauth-state';

jest.mock('@common/config/jwt-keys', () => ({
    privateKeyFrom: () => 'state-signing-secret',
}));

const INPUT: OAuthStateInput = {
    state: 'returned-state',
    nonce: 'nonce-value',
    verifier: 'verifier-value',
    provider: AuthProvider.GOOGLE,
    purpose: 'signin',
    redirect: '/dashboard/saved',
};

describe('OAuthStateCodec', () => {
    const codec = new OAuthStateCodec(new ConfigService());

    afterEach(() => {
        jest.useRealTimers();
    });

    it('opens what it sealed when the returned state matches', () => {
        expect(codec.open(codec.seal(INPUT), INPUT.state)).toMatchObject(INPUT);
    });

    it('refuses a returned state that does not match the cookie', () => {
        expect(codec.open(codec.seal(INPUT), 'forged-state')).toBeNull();
    });

    it('refuses a sealed state whose body was rewritten', () => {
        const [, signature] = codec.seal(INPUT).split('.');
        const rewritten = Buffer.from(
            JSON.stringify({
                ...INPUT,
                redirect: '/admin',
                expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
            }),
        ).toString('base64url');

        expect(codec.open(`${rewritten}.${signature}`, INPUT.state)).toBeNull();
    });

    it('refuses a sealed state once it has expired', () => {
        jest.useFakeTimers();
        const sealed = codec.seal(INPUT);
        jest.advanceTimersByTime(OAUTH_STATE_TTL_MS + 1);

        expect(codec.open(sealed, INPUT.state)).toBeNull();
    });

    it('refuses a callback that arrives without its cookie', () => {
        expect(codec.open(null, INPUT.state)).toBeNull();
    });
});
