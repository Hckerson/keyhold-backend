import { randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
    UserRole,
    VerificationStatus,
    VerificationType,
} from 'generated/prisma/enums';
import { PasswordUtil } from './utils/password.util';
import { metricBuilder } from 'src/lib/metric-builder';
import { UsersService } from '@core/users/users.service';
import { UserRepo } from '@common/repos/user.repo';
import { EmailVerificationRepo } from '@common/repos/email-verification.repo';
import { SendGridEmailService } from '@common/services/email/sendgrid.service';
import { SettingsService } from '@modules/settings/settings.service';
import { SuspensionsService } from '@modules/suspensions/suspensions.service';
import type { AuthResponse, JwtPayload } from './types/auth.types';
import {
    DEFAULT_FRONTEND_URL,
    LOGIN_MAX_ATTEMPTS,
    LOGIN_WINDOW_MS,
    SETTING_MAINTENANCE,
    SETTING_OPEN_SIGNUPS,
} from '@common/enums';
import {
    LoginDto,
    RegisterDto,
    ResetPasswordDto,
    OnboardingDto,
    ForgotPasswordDto,
} from './dto';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

const GENERIC_RESET_MESSAGE =
    'If the email exists, reset instructions were sent.';

import {
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
    ServiceUnavailableException,
    UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
        private readonly userRepo: UserRepo,
        private readonly verificationTokenRepo: EmailVerificationRepo,
        private readonly emailService: SendGridEmailService,
        private readonly settingsService: SettingsService,
        private readonly suspensionsService: SuspensionsService,
    ) {}

    private readonly loginFailures = new Map<
        string,
        { count: number; resetAt: number }
    >();

    async register(dto: RegisterDto): Promise<AuthResponse> {
        const open = await this.settingsService.findValue(SETTING_OPEN_SIGNUPS);
        if (open === 'false') {
            throw new ForbiddenException('Registration is currently closed');
        }
        const passwordHash = await PasswordUtil.hash(dto.password);
        const data = metricBuilder({
            passwordHash,
            role: dto.role,
            email: dto.email,
            fullName: dto.fullName,
            phoneNumber: dto.phoneNumber,
        });

        const user = await this.usersService.create(data);
        const accessToken = this.generateToken({
            id: user.id,
            email: user.email,
            role: user.role,
        });

        return { user: this.toAuthUser(user), accessToken };
    }

    async login(dto: LoginDto): Promise<AuthResponse> {
        this.assertNotLocked(dto.email);
        const user = await this.authenticateUser(dto.email, dto.password);
        await this.suspensionsService.ensureActive(user.id, user.status);
        await this.assertNotInMaintenance(user.role);
        const accessToken = this.generateToken({
            id: user.id,
            email: user.email,
            role: user.role,
        });

        await this.userRepo.update({
            where: { id: user.id },
            data: { lastActive: new Date() },
        });

        return { user: this.toAuthUser(user), accessToken };
    }

    async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
        const user = await this.usersService.findByEmail(dto.email);

        if (user) {
            await this.verificationTokenRepo.updateMany({
                where: {
                    userId: user.id,
                    type: VerificationType.PASSWORD_RESET,
                    status: VerificationStatus.PENDING,
                },
                data: { status: VerificationStatus.REJECTED },
            });

            const token = randomBytes(32).toString('base64url');
            await this.verificationTokenRepo.create({
                data: {
                    token,
                    userId: user.id,
                    type: VerificationType.PASSWORD_RESET,
                    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
                },
            });

            const frontendUrl =
                this.configService.get<string>('FRONTEND_URL') ??
                DEFAULT_FRONTEND_URL;

            await this.sendResetEmail(
                user.email,
                user.fullName,
                `${frontendUrl}/reset-password?token=${token}`,
            );
        }

        return { message: GENERIC_RESET_MESSAGE };
    }

    private async sendResetEmail(
        email: string,
        fullName: string,
        resetUrl: string,
    ): Promise<void> {
        try {
            await this.emailService.sendPasswordResetEmail(
                email,
                fullName,
                resetUrl,
            );
        } catch (error: unknown) {
            this.logger.error(
                `Failed to send password reset email: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
        const record = await this.verificationTokenRepo.findUnique({
            where: { token: dto.token },
        });

        const isUsable =
            record &&
            record.type === VerificationType.PASSWORD_RESET &&
            record.status === VerificationStatus.PENDING &&
            record.expiresAt > new Date();

        if (!isUsable) {
            throw new UnauthorizedException('Invalid or expired token.');
        }

        const passwordHash = await PasswordUtil.hash(dto.password);
        await this.usersService.update(record.userId, { passwordHash });
        await this.verificationTokenRepo.update({
            where: { id: record.id },
            data: {
                status: VerificationStatus.VERIFIED,
                verifiedAt: new Date(),
            },
        });

        return { message: 'Password reset successful.' };
    }

    async logout(userId: string | undefined) {
        if (!userId) throw new UnauthorizedException();
        await this.usersService.revokeTokens(userId);
        return { success: true };
    }

    async onboarding(
        userId: string | undefined,
        dto: OnboardingDto,
    ): Promise<{ message: string }> {
        if (!userId) throw new UnauthorizedException('User not authenticated');
        const user = await this.usersService.findOne(userId);
        if (!user) throw new NotFoundException('User not found');

        await this.usersService.update(userId, {
            bio: dto.bio,
            phoneNumber: dto.phoneNumber,
        });
        return { message: 'Onboarding completed.' };
    }

    private toAuthUser(user: {
        id: string;
        fullName: string;
        email: string;
        role: UserRole;
    }) {
        return {
            id: user.id,
            name: user.fullName,
            email: user.email,
            role: user.role,
        };
    }

    private generateToken(user: {
        id: string;
        email: string;
        role: UserRole;
    }): string {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };
        return this.jwtService.sign(payload);
    }

    private async authenticateUser(email: string, password: string) {
        const user = await this.userRepo.findUnique({ where: { email } });
        if (!user) {
            this.noteFailure(email);
            throw new UnauthorizedException('Invalid credentials');
        }

        const passwordValid = await PasswordUtil.compare(
            password,
            user.passwordHash,
        );
        if (!passwordValid) {
            this.noteFailure(email);
            throw new UnauthorizedException('Invalid credentials');
        }

        this.loginFailures.delete(email.toLowerCase());

        return {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            status: user.status,
        };
    }

    private assertNotLocked(email: string) {
        const current = this.loginFailures.get(email.toLowerCase());
        if (
            current &&
            current.resetAt > Date.now() &&
            current.count >= LOGIN_MAX_ATTEMPTS
        ) {
            throw new UnauthorizedException('Invalid credentials');
        }
    }

    private noteFailure(email: string) {
        const key = email.toLowerCase();
        const now = Date.now();
        const current = this.loginFailures.get(key);
        if (!current || current.resetAt <= now) {
            this.loginFailures.set(key, {
                count: 1,
                resetAt: now + LOGIN_WINDOW_MS,
            });
            return;
        }
        current.count += 1;
    }

    private async assertNotInMaintenance(role: UserRole) {
        const maintenance =
            await this.settingsService.findValue(SETTING_MAINTENANCE);
        if (maintenance === 'true' && role !== UserRole.ADMIN) {
            throw new ServiceUnavailableException(
                'The platform is under maintenance',
            );
        }
    }
}
