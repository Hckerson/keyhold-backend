import type { AuthProvider } from '@generated/prisma/enums';

export interface OAuthProfile {
    provider: AuthProvider;
    providerUserId: string;
    email: string | null;
    emailVerified: boolean;
    fullName: string;
}

export interface AuthorizeRequest {
    state: string;
    nonce: string;
    challenge: string;
}
