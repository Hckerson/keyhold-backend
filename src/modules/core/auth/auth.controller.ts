import { JwtAuthGuard } from './guards';
import { AuthService } from './auth.service';

import {
    Post,
    Body,
    Request,
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
import type { RequestWithUser } from '@common/interfaces/req';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({
        status: 201,
        description:
            'User successfully registered. Returns user + accessToken.',
    })
    @ApiResponse({ status: 409, description: 'User already exists' })
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login and get JWT token' })
    @ApiResponse({ status: 200, description: 'Login successful' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    // ─── Password Management ──────────────────────────────────────────────────

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Request a password reset' })
    forgotPassword(@Body() dto: ForgotPasswordDto) {
        void dto;
        // Wire up your email provider here to deliver a reset token.
        return {
            message: 'If the email exists, reset instructions were sent.',
        };
    }

    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reset password' })
    async resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto);
    }

    // ─── Onboarding ──────────────────────────────────────────────────────────

    @Post('onboarding')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Complete profile onboarding' })
    async onboarding(
        @Body() dto: OnboardingDto,
        @Request() req: RequestWithUser,
    ) {
        return this.authService.onboarding(req.user.id, dto);
    }
}
