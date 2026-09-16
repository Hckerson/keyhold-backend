import { Test } from '@nestjs/testing';
import {
    AuthProvider,
    UserAccountStatus,
    UserRole,
} from '@generated/prisma/enums';
import { AuthIdentityRepo } from '@common/repos/auth-identity.repo';
import { UserRepo } from '@common/repos/user.repo';
import { GoogleOAuthClient } from '@common/services/oauth/google-oauth.client';
import { FacebookOAuthClient } from '@common/services/oauth/facebook-oauth.client';
import { OAuthStateCodec } from '@common/services/oauth/oauth-state';
import type { OAuthProfile } from '@common/services/oauth/oauth.types';
import { UsersService } from '@core/users/users.service';
import { SettingsService } from '@modules/settings/settings.service';
import { AuthService } from '../auth.service';
import { OAuthService } from './oauth.service';

const PROFILE: OAuthProfile = {
    provider: AuthProvider.GOOGLE,
    providerUserId: 'google-user-1',
    email: 'ada@example.com',
    emailVerified: true,
    fullName: 'Ada Lovelace',
};

describe('OAuthService', () => {
    let service: OAuthService;
    let identityRepo: { findUnique: jest.Mock; create: jest.Mock };
    let userRepo: { findUnique: jest.Mock };
    let usersService: { create: jest.Mock };
    let settingsService: { findValue: jest.Mock };
    let codec: { open: jest.Mock; seal: jest.Mock };

    beforeEach(async () => {
        identityRepo = {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn(),
        };
        userRepo = { findUnique: jest.fn().mockResolvedValue(null) };
        usersService = {
            create: jest.fn().mockResolvedValue({ id: 'usr_new' }),
        };
        settingsService = { findValue: jest.fn().mockResolvedValue('true') };
        codec = { open: jest.fn(), seal: jest.fn() };

        const moduleRef = await Test.createTestingModule({
            providers: [
                OAuthService,
                { provide: AuthIdentityRepo, useValue: identityRepo },
                { provide: UserRepo, useValue: userRepo },
                { provide: UsersService, useValue: usersService },
                { provide: SettingsService, useValue: settingsService },
                { provide: OAuthStateCodec, useValue: codec },
                {
                    provide: AuthService,
                    useValue: { sessionForUser: jest.fn() },
                },
                { provide: GoogleOAuthClient, useValue: { enabled: true } },
                { provide: FacebookOAuthClient, useValue: { enabled: true } },
            ],
        }).compile();

        service = moduleRef.get(OAuthService);
    });

    it('signs in the member already linked to the provider account', async () => {
        identityRepo.findUnique.mockResolvedValue({
            user: { id: 'usr_1', status: UserAccountStatus.ACTIVE },
        });

        await expect(service.resolveUser(PROFILE)).resolves.toBe('usr_1');
        expect(userRepo.findUnique).not.toHaveBeenCalled();
    });

    it('links a verified provider email to a member who confirmed the same address', async () => {
        userRepo.findUnique.mockResolvedValue({
            id: 'usr_1',
            status: UserAccountStatus.ACTIVE,
            emailVerified: true,
        });

        await expect(service.resolveUser(PROFILE)).resolves.toBe('usr_1');
        expect(identityRepo.create).toHaveBeenCalledWith({
            data: {
                provider: AuthProvider.GOOGLE,
                providerUserId: 'google-user-1',
                email: 'ada@example.com',
                userId: 'usr_1',
            },
        });
    });

    it('refuses to merge into an account whose email was never confirmed', async () => {
        userRepo.findUnique.mockResolvedValue({
            id: 'usr_1',
            status: UserAccountStatus.ACTIVE,
            emailVerified: false,
        });

        await expect(service.resolveUser(PROFILE)).rejects.toMatchObject({
            code: 'unverified',
        });
        expect(identityRepo.create).not.toHaveBeenCalled();
    });

    it('refuses a provider account whose email the provider has not verified', async () => {
        await expect(
            service.resolveUser({ ...PROFILE, emailVerified: false }),
        ).rejects.toMatchObject({ code: 'unverified' });
        expect(userRepo.findUnique).not.toHaveBeenCalled();
    });

    it('never signs a deleted account back in', async () => {
        identityRepo.findUnique.mockResolvedValue({
            user: { id: 'usr_1', status: UserAccountStatus.DELETED },
        });

        await expect(service.resolveUser(PROFILE)).rejects.toMatchObject({
            code: 'blocked',
        });
    });

    it('opens a confirmed account for a new member while signups are open', async () => {
        await expect(
            service.resolveUser(PROFILE, UserRole.SELLER),
        ).resolves.toBe('usr_new');
        expect(usersService.create).toHaveBeenCalledWith(
            expect.objectContaining({
                email: 'ada@example.com',
                role: UserRole.SELLER,
                emailVerified: true,
            }),
        );
        expect(identityRepo.create).toHaveBeenCalledTimes(1);
    });

    it('refuses a new member while signups are closed', async () => {
        settingsService.findValue.mockResolvedValue('false');

        await expect(service.resolveUser(PROFILE)).rejects.toMatchObject({
            code: 'closed',
        });
        expect(usersService.create).not.toHaveBeenCalled();
    });

    it('treats a provider error on the callback as a cancellation', async () => {
        await expect(
            service.complete(AuthProvider.GOOGLE, {
                error: 'access_denied',
                sealed: null,
            }),
        ).rejects.toMatchObject({ code: 'denied' });
    });

    it('refuses a callback whose state does not match its cookie', async () => {
        codec.open.mockReturnValue(null);

        await expect(
            service.complete(AuthProvider.GOOGLE, {
                code: 'authorization-code',
                state: 'forged-state',
                sealed: 'sealed-state',
            }),
        ).rejects.toMatchObject({ code: 'failed' });
    });
});
