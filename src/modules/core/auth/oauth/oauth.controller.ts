import {
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Logger,
    NotFoundException,
    Param,
    Query,
    Req,
    Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { UserRole } from '@generated/prisma/enums';
import { DEFAULT_FRONTEND_URL } from '@common/enums';
import { authThrottle } from '@common/config/throttle.config';
import {
    clearOAuthStateCookie,
    oauthStateFrom,
    setOAuthStateCookie,
    setSessionCookie,
} from '@common/config/session-cookie';
import { OAuthError, OAuthService, type OAuthFailure } from './oauth.service';

const LOGIN_PATH = '/login';
const FAILURE_PARAM = 'oauth';
const SAFE_REDIRECT = /^\/(?![/\\])[^\\]*$/;

const PORTAL_BY_ROLE: Record<UserRole, string> = {
    [UserRole.ADMIN]: '/admin',
    [UserRole.BUYER]: '/dashboard',
    [UserRole.SELLER]: '/agent',
};

const safeRedirect = (redirect: string | undefined): string | undefined =>
    redirect && SAFE_REDIRECT.test(redirect) ? redirect : undefined;

const failureFrom = (error: unknown): OAuthFailure => {
    if (error instanceof OAuthError) return error.code;
    if (error instanceof HttpException) {
        if (error.getStatus() === HttpStatus.FORBIDDEN) return 'blocked';
        if (error.getStatus() === HttpStatus.SERVICE_UNAVAILABLE) {
            return 'maintenance';
        }
    }
    return 'failed';
};

@ApiTags('auth')
@Controller('auth')
export class OAuthController {
    private readonly logger = new Logger(OAuthController.name);
    private readonly frontendUrl: string;

    constructor(
        private readonly oauthService: OAuthService,
        configService: ConfigService,
    ) {
        this.frontendUrl =
            configService.get<string>('FRONTEND_URL') ?? DEFAULT_FRONTEND_URL;
    }

    @Throttle(authThrottle)
    @Get(':provider')
    @ApiOperation({ summary: 'Start signing in with an external provider' })
    start(
        @Param('provider') slug: string,
        @Query('redirect') redirect: string | undefined,
        @Query('role') role: string | undefined,
        @Res() response: Response,
    ) {
        const provider = this.providerFor(slug);

        try {
            const { url, sealed } = this.oauthService.begin(provider, {
                redirect: safeRedirect(redirect),
                role,
            });
            setOAuthStateCookie(response, sealed);
            response.redirect(url);
        } catch (error) {
            this.fail(response, error);
        }
    }

    @Throttle(authThrottle)
    @Get(':provider/callback')
    @ApiOperation({ summary: 'Finish signing in with an external provider' })
    async callback(
        @Param('provider') slug: string,
        @Query('code') code: string | undefined,
        @Query('state') state: string | undefined,
        @Query('error') error: string | undefined,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const provider = this.providerFor(slug);
        const sealed = oauthStateFrom(request);
        clearOAuthStateCookie(response);

        try {
            const { session, redirect } = await this.oauthService.complete(
                provider,
                { code, state, error, sealed },
            );
            if (session.accessToken) {
                setSessionCookie(
                    response,
                    session.accessToken,
                    session.expiresAt,
                );
            }
            response.redirect(
                `${this.frontendUrl}${redirect ?? PORTAL_BY_ROLE[session.user.role]}`,
            );
        } catch (failure) {
            this.fail(response, failure);
        }
    }

    private providerFor(slug: string) {
        const provider = this.oauthService.providerFrom(slug);
        if (!provider) throw new NotFoundException();
        return provider;
    }

    private fail(response: Response, error: unknown) {
        const code = failureFrom(error);
        if (code === 'failed') {
            this.logger.warn(
                `OAuth sign-in failed: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
        response.redirect(
            `${this.frontendUrl}${LOGIN_PATH}?${FAILURE_PARAM}=${code}`,
        );
    }
}
