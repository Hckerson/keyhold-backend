import { CookieOptions, Request, Response } from 'express';

export const SESSION_COOKIE = 'access_token';

const MS_PER_SECOND = 1000;

const baseOptions = (): CookieOptions => ({
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax',
    path: '/',
});

export const setSessionCookie = (
    response: Response,
    token: string,
    expiresAtSeconds: number | undefined,
    remember = true,
) => {
    const expires =
        remember && expiresAtSeconds
            ? new Date(expiresAtSeconds * MS_PER_SECOND)
            : undefined;

    response.cookie(SESSION_COOKIE, token, { ...baseOptions(), expires });
};

export const clearSessionCookie = (response: Response) => {
    response.clearCookie(SESSION_COOKIE, baseOptions());
};

export const sessionCookieFrom = (request: Request): string | null => {
    const header = request.headers.cookie;
    if (!header) return null;

    for (const part of header.split(';')) {
        const separator = part.indexOf('=');
        if (separator === -1) continue;

        if (part.slice(0, separator).trim() !== SESSION_COOKIE) continue;

        const value = part.slice(separator + 1).trim();
        return value.length > 0 ? decodeURIComponent(value) : null;
    }

    return null;
};
