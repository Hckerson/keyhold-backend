import { generateKeyPairSync, sign as cryptoSign } from 'node:crypto';
import type { ConfigService } from '@nestjs/config';
import { JWT_ALGORITHM, privateKeyFrom, publicKeyFrom } from './jwt-keys';

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const base64 = (pem: string) => Buffer.from(pem, 'utf8').toString('base64');

const configOf = (values: Record<string, string | undefined>) =>
    ({ get: (key: string) => values[key] }) as unknown as ConfigService;

describe('JWT key loading', () => {
    it('signs with RS256, so the verifying key is not the signing key', () => {
        expect(JWT_ALGORITHM).toBe('RS256');
    });

    it('accepts a base64-encoded PEM, which is how it survives a .env line', () => {
        const config = configOf({
            JWT_PRIVATE_KEY: base64(privateKey),
            JWT_PUBLIC_KEY: base64(publicKey),
        });

        expect(privateKeyFrom(config)).toBe(privateKey);
        expect(publicKeyFrom(config)).toBe(publicKey);
    });

    it('accepts a raw PEM too, for a deployment that can hold newlines', () => {
        expect(publicKeyFrom(configOf({ JWT_PUBLIC_KEY: publicKey }))).toBe(
            publicKey,
        );
    });

    it('refuses a value that decodes to something other than a PEM key', () => {
        expect(() =>
            privateKeyFrom(configOf({ JWT_PRIVATE_KEY: 'not-a-key' })),
        ).toThrow(/not a PEM key/);
    });

    it('refuses a missing key rather than starting without one', () => {
        expect(() => publicKeyFrom(configOf({}))).toThrow(/JWT_PUBLIC_KEY/);
    });

    it('cannot mint a token from the public key alone', () => {
        expect(() =>
            cryptoSign('sha256', Buffer.from('payload'), publicKey),
        ).toThrow();
    });

    it('can mint a token from the private key', () => {
        expect(() =>
            cryptoSign('sha256', Buffer.from('payload'), privateKey),
        ).not.toThrow();
    });
});
