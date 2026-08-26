import {
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OfferRepo } from '@common/repos/offer.repo';
import { ConnectionRepo } from '@common/repos/connection.repo';
import { PropertyRepo } from '@common/repos/property.repo';
import { SendGridEmailService } from '@common/services/email/sendgrid.service';
import { TwilioService } from '@common/services/notification/twilio.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import {
    ConnectionStatus,
    OfferStatus,
    PropertyStatus,
    UserRole,
} from '@generated/prisma/enums';
import { OffersService } from './offers.service';

const BUYER = 'usr_buyer';
const SELLER = 'usr_seller';
const STRANGER = 'usr_stranger';

describe('OffersService', () => {
    let service: OffersService;
    let offerRepo: {
        findUnique: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
        updateMany: jest.Mock;
    };
    let connectionRepo: { findUnique: jest.Mock };
    let propertyRepo: { update: jest.Mock };

    beforeEach(async () => {
        offerRepo = {
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn().mockImplementation(({ data }) => ({
                id: 'off_1',
                offererId: BUYER,
                propertyId: 'prop_1',
                ...data,
            })),
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        };
        connectionRepo = { findUnique: jest.fn() };
        propertyRepo = { update: jest.fn() };

        const moduleRef = await Test.createTestingModule({
            providers: [
                OffersService,
                { provide: OfferRepo, useValue: offerRepo },
                { provide: ConnectionRepo, useValue: connectionRepo },
                { provide: PropertyRepo, useValue: propertyRepo },
                {
                    provide: SendGridEmailService,
                    useValue: {
                        sendOfferNotification: jest.fn(),
                        sendEmail: jest.fn(),
                    },
                },
                {
                    provide: TwilioService,
                    useValue: { sendOfferNotificationSMS: jest.fn() },
                },
                {
                    provide: NotificationsService,
                    useValue: { notify: jest.fn() },
                },
            ],
        }).compile();

        service = moduleRef.get(OffersService);
    });

    it('refuses an offer on a sold listing', async () => {
        connectionRepo.findUnique.mockResolvedValue({
            id: 'con_1',
            buyerId: BUYER,
            sellerId: SELLER,
            status: ConnectionStatus.ACCEPTED,
            property: {
                id: 'prop_1',
                title: 'Cypress',
                status: PropertyStatus.SOLD,
            },
            seller: { email: 's@example.com', phoneNumber: null },
            buyer: { fullName: 'Ada' },
        });

        await expect(
            service.makeOffer(BUYER, {
                connectionId: 'con_1',
                offeredPrice: 1_000_000,
                offeredTerms: 'Cash',
                expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
            }),
        ).rejects.toThrow(BadRequestException);
    });

    it('refuses to accept an expired offer', async () => {
        offerRepo.findUnique.mockResolvedValue({
            id: 'off_1',
            offererId: BUYER,
            status: OfferStatus.PENDING,
            expiresAt: new Date('2020-01-01'),
            connection: { sellerId: SELLER },
            property: { id: 'prop_1', status: PropertyStatus.AVAILABLE },
        });

        await expect(
            service.respondToOffer('off_1', SELLER, {
                status: OfferStatus.ACCEPTED,
            }),
        ).rejects.toThrow(BadRequestException);
        expect(offerRepo.update).not.toHaveBeenCalled();
    });

    it('rejects sibling offers when one is accepted', async () => {
        offerRepo.findUnique.mockResolvedValue({
            id: 'off_1',
            offererId: BUYER,
            status: OfferStatus.PENDING,
            expiresAt: new Date(Date.now() + 86_400_000),
            connection: { sellerId: SELLER },
            property: { id: 'prop_1', status: PropertyStatus.AVAILABLE },
        });

        await service.respondToOffer('off_1', SELLER, {
            status: OfferStatus.ACCEPTED,
        });

        expect(offerRepo.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    propertyId: 'prop_1',
                    id: { not: 'off_1' },
                }),
            }),
        );
        expect(propertyRepo.update).toHaveBeenCalledWith({
            where: { id: 'prop_1' },
            data: { status: PropertyStatus.PENDING },
        });
    });

    it('refuses a stranger reading an offer', async () => {
        offerRepo.findUnique.mockResolvedValue({
            id: 'off_1',
            connection: { buyerId: BUYER, sellerId: SELLER },
        });

        await expect(
            service.getOne('off_1', STRANGER, UserRole.BUYER),
        ).rejects.toThrow(ForbiddenException);
    });
});
