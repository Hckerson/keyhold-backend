import { createHash, randomBytes } from 'crypto';

const TOKEN_BYTES = 32;

export interface IssuedToken {
    token: string;
    hash: string;
}

export const hashToken = (token: string): string =>
    createHash('sha256').update(token).digest('hex');

export const issueToken = (): IssuedToken => {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    return { token, hash: hashToken(token) };
};
