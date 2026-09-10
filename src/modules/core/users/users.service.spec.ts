import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRepo } from '@common/repos/user.repo';
import { TransactionRepo } from '@common/repos/transaction.repo';
import { CloudinaryService } from '@common/services/storage/cloudinary.service';
import { UserRole } from '@generated/prisma/enums';
import { UsersService } from './users.service';

describe('UsersService', () => {
    let service: UsersService;
    let userRepo: { findUnique: jest.Mock; create: jest.Mock };

    beforeEach(async () => {
        userRepo = {
            findUnique: jest.fn(),
            create: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            providers: [
                UsersService,
                { provide: UserRepo, useValue: userRepo },
                {
                    provide: TransactionRepo,
                    useValue: { groupBy: jest.fn().mockResolvedValue([]) },
                },
                {
                    provide: CloudinaryService,
                    useValue: {
                        uploadAvatar: jest.fn(),
                        deleteImage: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = moduleRef.get(UsersService);
    });

    it('refuses a duplicate email on create', async () => {
        userRepo.findUnique.mockResolvedValue({ id: 'usr_1' });

        await expect(
            service.create({
                email: 'ada@example.com',
                fullName: 'Ada',
                passwordHash: 'hash',
            }),
        ).rejects.toThrow(ConflictException);
        expect(userRepo.create).not.toHaveBeenCalled();
    });

    it('hides private fields from a stranger', async () => {
        userRepo.findUnique.mockResolvedValue({
            id: 'usr_1',
            fullName: 'Ada',
            email: 'ada@example.com',
            phoneNumber: '+1',
            bio: 'Buyer',
            avatar: null,
            role: UserRole.BUYER,
            status: 'ACTIVE',
            tier: 'STANDARD',
            jobTitle: null,
            agencyName: null,
            licenseNumber: null,
            emailVerified: true,
            phoneVerified: false,
            kycVerified: true,
            lastActive: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const visible = await service.findVisible(
            'usr_1',
            'usr_stranger',
            UserRole.BUYER,
        );

        expect(visible).not.toHaveProperty('email');
        expect(visible).not.toHaveProperty('status');
        expect(visible).toHaveProperty('fullName', 'Ada');
    });
});
