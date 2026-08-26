import {
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TransactionRepo } from '@common/repos/transaction.repo';
import { OfferRepo } from '@common/repos/offer.repo';
import { ConnectionRepo } from '@common/repos/connection.repo';
import { UserRepo } from '@common/repos/user.repo';
import { PropertyRepo } from '@common/repos/property.repo';
import { StripeService } from '@common/services/payment/stripe.service';
import { EscrowService } from '@modules/escrow/escrow.service';
import { SettingsService } from '@modules/settings/settings.service';
import {
    OfferStatus,
    PropertyStatus,
    TransactionStatus,
} from '@generated/prisma/enums';
import { TransactionsService } from './transactions.service';

const BUYER = 'usr_buyer';
const SELLER = 'usr_seller';

describe('TransactionsService', () => {
    let service: TransactionsService;
    let offerRepo: { findUnique: jest.Mock };
    let userRepo: { findUnique: jest.Mock };
    let transactionRepo: {
        findFirst: jest.Mock;
        findUnique: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
    };
    let stripeService: { createPaymentIntent: jest.Mock; confirmPayment: jest.Mock };
    let escrowService: { hold: jest.Mock };

    beforeEach(async () => {
        offerRepo = { findUnique: jest.fn() };
        userRepo = { findUnique: jest.fn() };
        transactionRepo = {
            findFirst: jest.fn().mockResolvedValue(null),
            findUnique: jest.fn(),
            create: jest.fn().mockResolvedValue({
                id: 'txn_1',
                propertyId: 'prop_1',
                buyerId: BUYER,
            }),
            update: jest.fn(),
        };
        stripeService = {
            createPaymentIntent: jest.fn().mockResolvedValue({
                id: 'pi_1',
                client_secret: 'secret',
                amount: 100_000_000,
            }),
            confirmPayment: jest.fn(),
        };
        escrowService = {
            hold: jest.fn().mockResolvedValue({
                id: 'esc_1',
                inspectionEndDate: new Date(),
            }),
        };

        const moduleRef = await Test.createTestingModule({
            providers: [
                TransactionsService,
                { provide: TransactionRepo, useValue: transactionRepo },
                { provide: OfferRepo, useValue: offerRepo },
                { provide: ConnectionRepo, useValue: {} },
                { provide: UserRepo, useValue: userRepo },
                { provide: PropertyRepo, useValue: { update: jest.fn() } },
                { provide: StripeService, useValue: stripeService },
                { provide: EscrowService, useValue: escrowService },
                {
                    provide: SettingsService,
                    useValue: { findValue: jest.fn().mockResolvedValue('usd') },
                },
            ],
        }).compile();

        service = moduleRef.get(TransactionsService);
    });

    it('refuses initiate when the buyer is not KYC verified', async () => {
        offerRepo.findUnique.mockResolvedValue({
            id: 'off_1',
            status: OfferStatus.ACCEPTED,
            expiresAt: new Date(Date.now() + 86_400_000),
            offeredPrice: { toNumber: () => 1_000_000 },
            responsePrice: null,
            connection: { id: 'con_1', buyerId: BUYER, sellerId: SELLER },
            property: { id: 'prop_1', status: PropertyStatus.PENDING },
        });
        userRepo.findUnique.mockResolvedValue({ kycVerified: false });

        await expect(
            service.initiateTransaction(BUYER, {
                offerId: 'off_1',
                finalPrice: 1,
                terms: 'Cash',
            }),
        ).rejects.toThrow(ForbiddenException);
    });

    it('locks checkout to the accepted offer price', async () => {
        offerRepo.findUnique.mockResolvedValue({
            id: 'off_1',
            status: OfferStatus.ACCEPTED,
            expiresAt: new Date(Date.now() + 86_400_000),
            offeredPrice: { toNumber: () => 1_150_000 },
            responsePrice: { toNumber: () => 1_100_000 },
            connection: { id: 'con_1', buyerId: BUYER, sellerId: SELLER },
            property: { id: 'prop_1', status: PropertyStatus.PENDING },
        });
        userRepo.findUnique.mockResolvedValue({ kycVerified: true });

        await service.initiateTransaction(BUYER, {
            offerId: 'off_1',
            finalPrice: 9,
            terms: 'Cash',
        });

        expect(transactionRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ finalPrice: 1_100_000 }),
            }),
        );
    });

    it('refuses a payment intent that is not bound to the transaction', async () => {
        transactionRepo.findUnique.mockResolvedValue({
            id: 'txn_1',
            buyerId: BUYER,
            stripePaymentIntentId: 'pi_real',
        });

        await expect(
            service.confirmPayment('txn_1', BUYER, 'pi_foreign'),
        ).rejects.toThrow(BadRequestException);
        expect(stripeService.confirmPayment).not.toHaveBeenCalled();
    });

    it('is idempotent once a hold already exists', async () => {
        const held = {
            id: 'txn_1',
            buyerId: BUYER,
            stripePaymentIntentId: 'pi_1',
            status: TransactionStatus.IN_PROGRESS,
            escrowHold: {
                id: 'esc_1',
                inspectionEndDate: new Date('2099-01-01'),
            },
        };
        transactionRepo.findUnique
            .mockResolvedValueOnce(held)
            .mockResolvedValueOnce(held);

        const result = await service.confirmPayment('txn_1', BUYER, 'pi_1');

        expect(result.escrow).toEqual(held.escrowHold);
        expect(escrowService.hold).not.toHaveBeenCalled();
    });
});
