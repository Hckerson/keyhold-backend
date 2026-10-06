import { Injectable } from '@nestjs/common';
import {
    AuthProvider,
    UserAccountStatus,
    UserRole,
} from '@generated/prisma/enums';
import { AuthIdentityRepo } from '@common/repos/auth-identity.repo';
import { UserRepo } from '@common/repos/user.repo';
import { SETTING_OPEN_SIGNUPS } from '@common/enums';
import { GoogleOAuthClient } from '@common/services/oauth/google-oauth.client';
import { FacebookOAuthClient } from '@common/services/oauth/facebook-oauth.client';
import {
    OAuthStateCodec,
    type OAuthState,
} from '@common/services/oauth/oauth-state';
import { challengeFor, randomToken } from '@common/services/oauth/pkce';
import type { OAuthProfile } from '@common/services/oauth/oauth.types';
import { UsersService } from '@core/users/users.service';
import { PasswordUtil } from '@core/auth/utils/password.util';
import { SettingsService } from '@modules/settings/settings.service';
import { AuthService } from '../auth.service';
import type { AuthResponse } from '../types/auth.types';

const PROVIDER_BY_SLUG = {
    google: AuthProvider.GOOGLE,
    facebook: AuthProvider.FACEBOOK,
} as const;

type ProviderSlug = keyof typeof PROVIDER_BY_SLUG;

const SIGNUP_ROLES: UserRole[] = [UserRole.BUYER, UserRole.SELLER];

export type OAuthFailure =
    | 'denied'
    | 'unverified'
    | 'closed'
    | 'blocked'
    | 'maintenance'
    | 'unavailable'
    | 'failed';

export class OAuthError extends Error {
    constructor(readonly code: OAuthFailure) {
        super(code);
    }
}

export interface OAuthCallback {
    code?: string;
    state?: string;
    error?: string;
    sealed: string | null;
}

const isProviderSlug = (slug: string): slug is ProviderSlug =>
    slug in PROVIDER_BY_SLUG;

export const callbackPathFor = (provider: AuthProvider): string =>
    `/auth/${provider.toLowerCase()}/callback`;

@Injectable()
export class OAuthService {
    constructor(
        private readonly google: GoogleOAuthClient,
        private readonly facebook: FacebookOAuthClient,
        private readonly codec: OAuthStateCodec,
        private readonly identityRepo: AuthIdentityRepo,
        private readonly userRepo: UserRepo,
        private readonly usersService: UsersService,
        private readonly settingsService: SettingsService,
        private readonly authService: AuthService,
    ) {}

    providerFrom(slug: string): AuthProvider | null {
        return isProviderSlug(slug) ? PROVIDER_BY_SLUG[slug] : null;
    }

    begin(
        provider: AuthProvider,
        options: { redirect?: string; role?: string },
    ): { url: string; sealed: string } {
        if (!this.isEnabled(provider)) throw new OAuthError('unavailable');

        const state = randomToken();
        const nonce = randomToken();
        const verifier = randomToken();
        const sealed = this.codec.seal({
            state,
            nonce,
            verifier,
            provider,
            purpose: 'signin',
            redirect: options.redirect,
            role: SIGNUP_ROLES.find((role) => role === options.role),
        });

        const path = callbackPathFor(provider);
        const url =
            provider === AuthProvider.GOOGLE
                ? this.google.authorizeUrl(path, {
                      state,
                      nonce,
                      challenge: challengeFor(verifier),
                  })
                : this.facebook.authorizeUrl(path, state);

        return { url, sealed };
    }

    async complete(
        provider: AuthProvider,
        callback: OAuthCallback,
    ): Promise<{ session: AuthResponse; redirect?: string }> {
        if (callback.error) throw new OAuthError('denied');

        const saved = this.codec.open(callback.sealed, callback.state);
        if (
            !saved ||
            saved.provider !== provider ||
            saved.purpose !== 'signin' ||
            !callback.code
        ) {
            throw new OAuthError('failed');
        }

        const profile = await this.profileFor(provider, callback.code, saved);
        const userId = await this.resolveUser(profile, saved.role);

        return {
            session: await this.authService.sessionForUser(userId),
            redirect: saved.redirect,
        };
    }

    async resolveUser(profile: OAuthProfile, role?: UserRole): Promise<string> {
        const identity = await this.identityRepo.findUnique({
            where: {
                provider_providerUserId: {
                    provider: profile.provider,
                    providerUserId: profile.providerUserId,
                },
            },
            include: { user: { select: { id: true, status: true } } },
        });
        if (identity) {
            this.assertUsable(identity.user.status);
            return identity.user.id;
        }

        if (!profile.email || !profile.emailVerified) {
            throw new OAuthError('unverified');
        }

        const existing = await this.userRepo.findUnique({
            where: { email: profile.email },
        });
        if (existing) {
            this.assertUsable(existing.status);
            if (!existing.emailVerified) throw new OAuthError('unverified');
            await this.link(existing.id, profile);
            return existing.id;
        }

        const signups =
            await this.settingsService.findValue(SETTING_OPEN_SIGNUPS);
        if (signups === 'false') throw new OAuthError('closed');

        const created = await this.usersService.create({
            email: profile.email,
            fullName: profile.fullName,
            role: role ?? UserRole.BUYER,
            passwordHash: await PasswordUtil.hash(randomToken()),
            emailVerified: true,
        });
        await this.link(created.id, profile);
        return created.id;
    }

    private async profileFor(
        provider: AuthProvider,
        code: string,
        saved: OAuthState,
    ): Promise<OAuthProfile> {
        const path = callbackPathFor(provider);
        if (provider === AuthProvider.FACEBOOK) {
            return this.facebook.profileFrom(path, code);
        }

        const tokens = await this.google.exchange(path, code, saved.verifier);
        if (!tokens.id_token) throw new OAuthError('failed');
        return this.google.profileFrom(tokens.id_token, saved.nonce);
    }

    private async link(userId: string, profile: OAuthProfile): Promise<void> {
        await this.identityRepo.create({
            data: {
                provider: profile.provider,
                providerUserId: profile.providerUserId,
                email: profile.email,
                userId,
            },
        });
    }

    private assertUsable(status: UserAccountStatus): void {
        if (status === UserAccountStatus.DELETED) {
            throw new OAuthError('blocked');
        }
    }

    private isEnabled(provider: AuthProvider): boolean {
        return provider === AuthProvider.GOOGLE
            ? this.google.enabled
            : this.facebook.enabled;
    }
}
