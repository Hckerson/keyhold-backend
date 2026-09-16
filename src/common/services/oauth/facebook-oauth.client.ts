import { createHmac } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { AuthProvider } from '@generated/prisma/enums';
import type { OAuthProfile } from './oauth.types';

const GRAPH_VERSION = 'v19.0';
const DIALOG_URL = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;
const SCOPES = ['email', 'public_profile'];
const PROFILE_FIELDS = 'id,name,email';
const FALLBACK_NAME = 'Facebook member';

const accessTokenSchema = z.object({ access_token: z.string().min(1) });

const debugTokenSchema = z.object({
    data: z.object({
        app_id: z.string(),
        is_valid: z.boolean(),
        user_id: z.string(),
    }),
});

const profileSchema = z.object({
    id: z.string().min(1),
    name: z.string().optional(),
    email: z.string().optional(),
});

export class FacebookTokenError extends Error {}

@Injectable()
export class FacebookOAuthClient {
    private readonly logger = new Logger(FacebookOAuthClient.name);
    private readonly appId?: string;
    private readonly appSecret?: string;
    private readonly apiBase?: string;

    constructor(configService: ConfigService) {
        this.appId = configService.get<string>(
            'externalServices.oauth.facebook.appId',
        );
        this.appSecret = configService.get<string>(
            'externalServices.oauth.facebook.appSecret',
        );
        this.apiBase = configService.get<string>(
            'externalServices.oauth.apiPublicUrl',
        );

        if (!this.enabled) {
            this.logger.warn(
                'Facebook OAuth not configured — Facebook sign-in is disabled',
            );
        }
    }

    get enabled(): boolean {
        return Boolean(this.appId && this.appSecret && this.apiBase);
    }

    authorizeUrl(callbackPath: string, state: string): string {
        const { appId, apiBase } = this.credentials();
        const params = new URLSearchParams({
            client_id: appId,
            redirect_uri: `${apiBase}${callbackPath}`,
            response_type: 'code',
            scope: SCOPES.join(','),
            state,
        });
        return `${DIALOG_URL}?${params.toString()}`;
    }

    async profileFrom(
        callbackPath: string,
        code: string,
    ): Promise<OAuthProfile> {
        const { appId, appSecret, apiBase } = this.credentials();

        const { access_token } = await this.getJson(
            `${GRAPH_URL}/oauth/access_token?${new URLSearchParams({
                client_id: appId,
                client_secret: appSecret,
                redirect_uri: `${apiBase}${callbackPath}`,
                code,
            }).toString()}`,
            accessTokenSchema,
        );

        const { data } = await this.getJson(
            `${GRAPH_URL}/debug_token?${new URLSearchParams({
                input_token: access_token,
                access_token: `${appId}|${appSecret}`,
            }).toString()}`,
            debugTokenSchema,
        );
        if (!data.is_valid || data.app_id !== appId) {
            throw new FacebookTokenError('Token was not issued for this app');
        }

        const profile = await this.getJson(
            `${GRAPH_URL}/me?${new URLSearchParams({
                fields: PROFILE_FIELDS,
                access_token,
                appsecret_proof: createHmac('sha256', appSecret)
                    .update(access_token)
                    .digest('hex'),
            }).toString()}`,
            profileSchema,
        );
        if (profile.id !== data.user_id) {
            throw new FacebookTokenError('Token belongs to a different user');
        }

        return {
            provider: AuthProvider.FACEBOOK,
            providerUserId: profile.id,
            email: profile.email?.toLowerCase() ?? null,
            emailVerified: profile.email !== undefined,
            fullName: profile.name ?? FALLBACK_NAME,
        };
    }

    private async getJson<T>(url: string, schema: z.ZodType<T>): Promise<T> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new FacebookTokenError(
                `Graph API returned ${response.status}`,
            );
        }
        return schema.parse(await response.json());
    }

    private credentials() {
        if (!this.appId || !this.appSecret || !this.apiBase) {
            throw new FacebookTokenError('Facebook OAuth is not configured');
        }
        return {
            appId: this.appId,
            appSecret: this.appSecret,
            apiBase: this.apiBase,
        };
    }
}
