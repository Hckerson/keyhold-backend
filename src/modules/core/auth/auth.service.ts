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
import type { AuthResponse, JwtPayload } from './types/auth.types';
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
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AuthService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
        private readonly userRepo: UserRepo,
        private readonly verificationTokenRepo: EmailVerificationRepo,
        private readonly emailService: SendGridEmailService,
    ) {}

    // ─── Registration & Login ──────────────────────────────────────────────────

    async register(dto: RegisterDto): Promise<AuthResponse> {
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
        const user = await this.authenticateUser(dto.email, dto.password);
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

    // ─── Password & Profile ─────────────────────────────────────────────────────

    async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
        const user = await this.usersService.findByEmail(dto.email);

        if (user) {
            const token = randomBytes(32).toString('base64url');
            await this.verificationTokenRepo.create({
                data: {
                    token,
                    userId: user.id,
                    type: VerificationType.PASSWORD_RESET,
                    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
                },
            });

            const resetUrl = `${this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000'}/reset-password?token=${token}`;
            await this.emailService.sendPasswordResetEmail(
                user.email,
                user.fullName,
                resetUrl,
            );
        }

        return { message: GENERIC_RESET_MESSAGE };
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

    // ─── Helpers ────────────────────────────────────────────────────────────────

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
        if (!user) throw new UnauthorizedException('Invalid credentials');

        const passwordValid = await PasswordUtil.compare(
            password,
            user.passwordHash,
        );
        if (!passwordValid)
            throw new UnauthorizedException('Invalid credentials');

        return {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
        };
    }
}
