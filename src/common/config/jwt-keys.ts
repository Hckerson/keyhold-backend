import type { ConfigService } from '@nestjs/config';

export const JWT_ALGORITHM = 'RS256' as const;

const PEM_MARKER = '-----BEGIN';

const decodeKey = (value: string, name: string): string => {
    const pem = value.includes(PEM_MARKER)
        ? value
        : Buffer.from(value, 'base64').toString('utf8');

    if (!pem.includes(PEM_MARKER)) {
        throw new Error(
            `${name} is not a PEM key, nor base64-encoded PEM. Run "pnpm keys:generate" to produce a valid pair.`,
        );
    }

    return pem;
};

const readKey = (config: ConfigService, name: string): string => {
    const value = config.get<string>(name);
    if (!value) {
        throw new Error(`${name} is not defined in environment variables`);
    }
    return decodeKey(value, name);
};

export const privateKeyFrom = (config: ConfigService) =>
    readKey(config, 'JWT_PRIVATE_KEY');

export const publicKeyFrom = (config: ConfigService) =>
    readKey(config, 'JWT_PUBLIC_KEY');
