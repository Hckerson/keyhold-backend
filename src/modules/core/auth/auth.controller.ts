import {
    type Request as ExpressRequest,
    type Response as ExpressResponse,
} from 'express';
import {
    clearSessionCookie,
    setSessionCookie,
} from '@common/config/session-cookie';
import { JwtAuthGuard } from './guards';
import { AuthService } from './auth.service';
import type { AuthResponse } from './types/auth.types';

import {
    Post,
    Body,
    Request,
    Res,
    HttpCode,
    UseGuards,
    Controller,
    HttpStatus,
} from '@nestjs/common';
import {
    LoginDto,
    RegisterDto,
    OnboardingDto,
    ResetPasswordDto,
    ForgotPasswordDto,
} from './dto';
import {
    ApiTags,
    ApiResponse,
    ApiOperation,
    ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    private issueSession(
        result: AuthResponse,
        response: ExpressResponse,
        remember = true,
    ): { user: AuthResponse['user'] } {
        if (result.accessToken) {
            setSessionCookie(
                response,
                result.accessToken,
                result.expiresAt,
                remember,
            );
        }
        return { user: result.user };
    }

    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({
        status: 201,
        description:
            'User successfully registered. Returns user + accessToken.',
    })
    @ApiResponse({ status: 409, description: 'User already exists' })
    async register(
        @Body() dto: RegisterDto,
        @Res({ passthrough: true }) response: ExpressResponse,
    ) {
        return this.issueSession(
            await this.authService.register(dto),
            response,
        );
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login and get JWT token' })
    @ApiResponse({ status: 200, description: 'Login successful' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(
        @Body() dto: LoginDto,
        @Res({ passthrough: true }) response: ExpressResponse,
    ) {
        return this.issueSession(
            await this.authService.login(dto),
            response,
            dto.remember ?? true,
        );
    }

    // ─── Password Management ──────────────────────────────────────────────────

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Request a password reset' })
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.forgotPassword(dto);
    }

    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reset password' })
    async resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto);
    }

    // ─── Onboarding ──────────────────────────────────────────────────────────

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'End every session for the current user' })
    async logout(
        @Request() req: ExpressRequest,
        @Res({ passthrough: true }) response: ExpressResponse,
    ) {
        clearSessionCookie(response);
        return this.authService.logout(req.user?.id);
    }

    @Post('onboarding')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Complete profile onboarding' })
    async onboarding(
        @Body() dto: OnboardingDto,
        @Request() req: ExpressRequest,
    ) {
        return this.authService.onboarding(req.user?.id, dto);
    }
}
