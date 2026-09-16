import { createHash, randomBytes } from 'crypto';

const TOKEN_BYTES = 32;

export const randomToken = (): string =>
    randomBytes(TOKEN_BYTES).toString('base64url');

export const challengeFor = (verifier: string): string =>
    createHash('sha256').update(verifier).digest('base64url');
