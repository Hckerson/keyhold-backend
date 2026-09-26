import { validateEnv } from './env.validation';
import { DEFAULT_FRONTEND_URL, DEFAULT_PORT, NodeEnv } from '@common/enums';

const complete = {
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/app',
    JWT_PRIVATE_KEY: 'private',
    JWT_PUBLIC_KEY: 'public',
};

describe('environment validation', () => {
    it('refuses to boot without the signing key', () => {
        expect(() =>
            validateEnv({ ...complete, JWT_PRIVATE_KEY: undefined }),
        ).toThrow(/JWT_PRIVATE_KEY/);
    });

    it('refuses to boot without the verifying key', () => {
        expect(() =>
            validateEnv({ ...complete, JWT_PUBLIC_KEY: undefined }),
        ).toThrow(/JWT_PUBLIC_KEY/);
    });

    it('fills the defaults a local run can do without', () => {
        const parsed = validateEnv(complete);

        expect(parsed.PORT).toBe(DEFAULT_PORT);
        expect(parsed.FRONTEND_URL).toBe(DEFAULT_FRONTEND_URL);
        expect(parsed.NODE_ENV).toBe(NodeEnv.DEVELOPMENT);
    });

    it('keeps values the environment did supply', () => {
        const parsed = validateEnv({
            ...complete,
            PORT: '8080',
            NODE_ENV: 'test',
        });

        expect(parsed.PORT).toBe(8080);
        expect(parsed.NODE_ENV).toBe(NodeEnv.TEST);
    });

    it('rejects a frontend URL that is not a URL', () => {
        expect(() =>
            validateEnv({ ...complete, FRONTEND_URL: 'not-a-url' }),
        ).toThrow(/FRONTEND_URL/);
    });
});
