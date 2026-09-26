import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PropertyRepo } from '@common/repos/property.repo';
import { OfferRepo } from '@common/repos/offer.repo';
import { TransactionRepo } from '@common/repos/transaction.repo';
import { PrismaService } from '@common/database/prisma.service';
import { CloudinaryService } from '@common/services/storage/cloudinary.service';
import { FlagsService } from '@modules/flags/flags.service';
import { PropertyStatus } from '@generated/prisma/enums';
import { PropertiesService } from './properties.service';

const SELLER = 'usr_seller';

describe('PropertiesService', () => {
    let service: PropertiesService;
    let propertyRepo: { findUnique: jest.Mock; update: jest.Mock };

    const listed = (status: PropertyStatus) =>
        propertyRepo.findUnique.mockResolvedValue({
            id: 'prop_1',
            sellerId: SELLER,
            status,
        });

    beforeEach(async () => {
        propertyRepo = {
            findUnique: jest.fn(),
            update: jest.fn().mockResolvedValue({ id: 'prop_1' }),
        };

        const moduleRef = await Test.createTestingModule({
            providers: [
                PropertiesService,
                { provide: PropertyRepo, useValue: propertyRepo },
                { provide: OfferRepo, useValue: { count: jest.fn() } },
                { provide: TransactionRepo, useValue: { count: jest.fn() } },
                { provide: PrismaService, useValue: {} },
                { provide: CloudinaryService, useValue: {} },
                {
                    provide: FlagsService,
                    useValue: { recordDecision: jest.fn() },
                },
            ],
        }).compile();

        service = moduleRef.get(PropertiesService);
    });

    it('refuses to relist a sold listing from the seller path', async () => {
        listed(PropertyStatus.SOLD);

        await expect(
            service.update('prop_1', SELLER, {
                status: PropertyStatus.AVAILABLE,
            }),
        ).rejects.toThrow(BadRequestException);
        expect(propertyRepo.update).not.toHaveBeenCalled();
    });

    it('refuses to return a listing under offer to the market', async () => {
        listed(PropertyStatus.PENDING);

        await expect(
            service.update('prop_1', SELLER, {
                status: PropertyStatus.AVAILABLE,
            }),
        ).rejects.toThrow(BadRequestException);
        expect(propertyRepo.update).not.toHaveBeenCalled();
    });

    it('refuses to move a listing under offer to draft', async () => {
        listed(PropertyStatus.PENDING);

        await expect(
            service.update('prop_1', SELLER, { status: PropertyStatus.DRAFT }),
        ).rejects.toThrow(BadRequestException);
        expect(propertyRepo.update).not.toHaveBeenCalled();
    });

    it('refuses to relist a rejected listing without moderation', async () => {
        listed(PropertyStatus.EXPIRED);

        await expect(
            service.update('prop_1', SELLER, {
                status: PropertyStatus.AVAILABLE,
            }),
        ).rejects.toThrow(BadRequestException);
        expect(propertyRepo.update).not.toHaveBeenCalled();
    });

    it('refuses to launder a rejected listing through draft', async () => {
        listed(PropertyStatus.EXPIRED);

        await expect(
            service.update('prop_1', SELLER, { status: PropertyStatus.DRAFT }),
        ).rejects.toThrow(BadRequestException);
        expect(propertyRepo.update).not.toHaveBeenCalled();
    });

    it('leaves marking a listing under offer to an accepted offer', async () => {
        listed(PropertyStatus.AVAILABLE);

        await expect(
            service.update('prop_1', SELLER, {
                status: PropertyStatus.PENDING,
            }),
        ).rejects.toThrow(BadRequestException);
        expect(propertyRepo.update).not.toHaveBeenCalled();
    });

    it('publishes a draft listing', async () => {
        listed(PropertyStatus.DRAFT);

        await service.update('prop_1', SELLER, {
            status: PropertyStatus.AVAILABLE,
        });

        expect(propertyRepo.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: { status: PropertyStatus.AVAILABLE },
            }),
        );
    });

    it('moves a live listing back to draft', async () => {
        listed(PropertyStatus.AVAILABLE);

        await service.update('prop_1', SELLER, {
            status: PropertyStatus.DRAFT,
        });

        expect(propertyRepo.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { status: PropertyStatus.DRAFT } }),
        );
    });

    it('still lets a seller edit the details of a sold listing', async () => {
        listed(PropertyStatus.SOLD);

        await service.update('prop_1', SELLER, { title: 'Cypress House' });

        expect(propertyRepo.update).toHaveBeenCalled();
    });
});
