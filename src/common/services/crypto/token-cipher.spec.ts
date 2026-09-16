import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { SealedTokenError, TokenCipher } from './token-cipher';

const KEY_BYTES = 32;
const REFRESH_TOKEN = '1//refresh-token-value';

const cipherWith = (tokenKey?: string) =>
    new TokenCipher(
        new ConfigService({ externalServices: { calendar: { tokenKey } } }),
    );

describe('TokenCipher', () => {
    const cipher = cipherWith(randomBytes(KEY_BYTES).toString('base64'));

    it('recovers the plaintext it sealed', () => {
        expect(cipher.decrypt(cipher.encrypt(REFRESH_TOKEN))).toBe(
            REFRESH_TOKEN,
        );
    });

    it('seals the same token differently every time', () => {
        expect(cipher.encrypt(REFRESH_TOKEN)).not.toBe(
            cipher.encrypt(REFRESH_TOKEN),
        );
    });

    it('refuses a sealed token whose ciphertext was altered', () => {
        const [iv, tag, body] = cipher.encrypt(REFRESH_TOKEN).split('.');
        const altered = Buffer.from(body ?? '', 'base64url');
        altered.writeUInt8(altered.readUInt8(0) ^ 1, 0);

        expect(() =>
            cipher.decrypt([iv, tag, altered.toString('base64url')].join('.')),
        ).toThrow();
    });

    it('refuses a sealed token with the wrong shape', () => {
        expect(() => cipher.decrypt('not-a-sealed-token')).toThrow(
            SealedTokenError,
        );
    });

    it('refuses to seal anything when no key is configured', () => {
        const unconfigured = cipherWith(undefined);

        expect(unconfigured.enabled).toBe(false);
        expect(() => unconfigured.encrypt(REFRESH_TOKEN)).toThrow(
            SealedTokenError,
        );
    });
});
