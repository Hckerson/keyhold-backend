import { BadRequestException, ForbiddenException } from '@nestjs/common';
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
const AGREED_PRICE = 1_000_000;
const AGREED_CENTS = 100_000_000;

const acceptedOffer = () => ({
    id: 'off_1',
    status: OfferStatus.ACCEPTED,
    expiresAt: new Date(Date.now() + 86_400_000),
    offeredPrice: { toNumber: () => AGREED_PRICE },
    responsePrice: null,
    connection: { id: 'con_1', buyerId: BUYER, sellerId: SELLER },
    property: { id: 'prop_1', status: PropertyStatus.PENDING },
});

const openCheckout = (
    overrides: {
        buyerId?: string;
        connectionId?: string;
        status?: TransactionStatus;
        stripePaymentIntentId?: string | null;
    } = {},
) => ({
    id: 'txn_open',
    propertyId: 'prop_1',
    connectionId: 'con_1',
    buyerId: BUYER,
    status: TransactionStatus.PENDING,
    stripePaymentIntentId: 'pi_open',
    ...overrides,
});

const intent = (status: string, amount = AGREED_CENTS) => ({
    id: 'pi_open',
    status,
    amount,
    currency: 'usd',
    client_secret: 'secret_open',
});

const checkout = { offerId: 'off_1', finalPrice: 1, terms: 'Cash' };

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
    let stripeService: {
        createPaymentIntent: jest.Mock;
        confirmPayment: jest.Mock;
        getPaymentIntent: jest.Mock;
        cancelPaymentIntent: jest.Mock;
    };
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
            getPaymentIntent: jest.fn(),
            cancelPaymentIntent: jest.fn(),
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

    describe('resuming a checkout', () => {
        beforeEach(() => {
            offerRepo.findUnique.mockResolvedValue(acceptedOffer());
            userRepo.findUnique.mockResolvedValue({ kycVerified: true });
        });

        it("resumes the buyer's own pending checkout without creating a second transaction or intent", async () => {
            transactionRepo.findFirst.mockResolvedValue(openCheckout());
            stripeService.getPaymentIntent.mockResolvedValue(
                intent('requires_payment_method'),
            );

            const result = await service.initiateTransaction(BUYER, checkout);

            expect(result.paymentIntent).toEqual({
                id: 'pi_open',
                clientSecret: 'secret_open',
                amount: AGREED_CENTS,
            });
            expect(transactionRepo.create).not.toHaveBeenCalled();
            expect(stripeService.createPaymentIntent).not.toHaveBeenCalled();
            expect(transactionRepo.update).not.toHaveBeenCalled();
        });

        it("issues the first intent on the buyer's own pending checkout that never received one, without a second transaction", async () => {
            transactionRepo.findFirst.mockResolvedValue(
                openCheckout({ stripePaymentIntentId: null }),
            );
            transactionRepo.update.mockResolvedValue(openCheckout());

            const result = await service.initiateTransaction(BUYER, checkout);

            expect(stripeService.getPaymentIntent).not.toHaveBeenCalled();
            expect(transactionRepo.create).not.toHaveBeenCalled();
            expect(stripeService.createPaymentIntent).toHaveBeenCalledWith(
                AGREED_PRICE,
                'usd',
                expect.objectContaining({ transactionId: 'txn_open' }),
                'txn_open:resume',
            );
            expect(transactionRepo.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'txn_open' },
                    data: {
                        stripePaymentIntentId: 'pi_1',
                        finalPrice: AGREED_PRICE,
                    },
                }),
            );
            expect(result.paymentIntent.id).toBe('pi_1');
        });

        it('issues a fresh intent on the same transaction when the old one was cancelled', async () => {
            transactionRepo.findFirst.mockResolvedValue(openCheckout());
            transactionRepo.update.mockResolvedValue(openCheckout());
            stripeService.getPaymentIntent.mockResolvedValue(
                intent('canceled'),
            );

            const result = await service.initiateTransaction(BUYER, checkout);

            expect(transactionRepo.create).not.toHaveBeenCalled();
            expect(stripeService.cancelPaymentIntent).not.toHaveBeenCalled();
            expect(stripeService.createPaymentIntent).toHaveBeenCalledWith(
                AGREED_PRICE,
                'usd',
                expect.objectContaining({ transactionId: 'txn_open' }),
                'txn_open:pi_open',
            );
            expect(transactionRepo.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'txn_open' },
                    data: {
                        stripePaymentIntentId: 'pi_1',
                        finalPrice: AGREED_PRICE,
                    },
                }),
            );
            expect(result.paymentIntent.id).toBe('pi_1');
        });

        it('cancels a payable intent whose amount drifted from the agreed price and issues one that matches', async () => {
            transactionRepo.findFirst.mockResolvedValue(openCheckout());
            transactionRepo.update.mockResolvedValue(openCheckout());
            stripeService.getPaymentIntent.mockResolvedValue(
                intent('requires_payment_method', 90_000_000),
            );

            const result = await service.initiateTransaction(BUYER, checkout);

            expect(stripeService.cancelPaymentIntent).toHaveBeenCalledWith(
                'pi_open',
            );
            expect(stripeService.createPaymentIntent).toHaveBeenCalledTimes(1);
            expect(transactionRepo.create).not.toHaveBeenCalled();
            expect(result.paymentIntent.amount).toBe(AGREED_CENTS);
        });

        it.each(['processing', 'succeeded'])(
            "refuses when the buyer's payment is already %s",
            async (status) => {
                transactionRepo.findFirst.mockResolvedValue(openCheckout());
                stripeService.getPaymentIntent.mockResolvedValue(
                    intent(status),
                );

                await expect(
                    service.initiateTransaction(BUYER, checkout),
                ).rejects.toThrow(
                    'Your payment is already being processed for this listing',
                );
                expect(
                    stripeService.createPaymentIntent,
                ).not.toHaveBeenCalled();
                expect(transactionRepo.create).not.toHaveBeenCalled();
            },
        );

        it('still refuses a live transaction that belongs to another buyer', async () => {
            transactionRepo.findFirst.mockResolvedValue(
                openCheckout({ buyerId: 'usr_other', connectionId: 'con_2' }),
            );

            await expect(
                service.initiateTransaction(BUYER, checkout),
            ).rejects.toThrow(
                'A transaction is already in progress for this listing',
            );
            expect(stripeService.getPaymentIntent).not.toHaveBeenCalled();
            expect(stripeService.createPaymentIntent).not.toHaveBeenCalled();
        });

        it("still refuses the buyer's own transaction once it has left PENDING", async () => {
            transactionRepo.findFirst.mockResolvedValue(
                openCheckout({ status: TransactionStatus.IN_PROGRESS }),
            );

            await expect(
                service.initiateTransaction(BUYER, checkout),
            ).rejects.toThrow(
                'A transaction is already in progress for this listing',
            );
            expect(stripeService.getPaymentIntent).not.toHaveBeenCalled();
        });
    });

    describe('settling the charged amount', () => {
        const awaitingPayment = (finalPrice: number) => ({
            id: 'txn_1',
            buyerId: BUYER,
            propertyId: 'prop_1',
            stripePaymentIntentId: 'pi_1',
            status: TransactionStatus.PENDING,
            finalPrice: { toNumber: () => finalPrice },
            property: { status: PropertyStatus.PENDING },
            escrowHold: null,
        });

        it('settles a zero-decimal currency when Stripe reports the whole amount', async () => {
            const pending = awaitingPayment(150_000_000);
            transactionRepo.findUnique
                .mockResolvedValueOnce(pending)
                .mockResolvedValueOnce(pending)
                .mockResolvedValueOnce(pending);
            stripeService.confirmPayment.mockResolvedValue({
                success: true,
                paymentIntent: { amount: 150_000_000, currency: 'jpy' },
            });

            await service.confirmPayment('txn_1', BUYER, 'pi_1');

            expect(escrowService.hold).toHaveBeenCalledTimes(1);
        });

        it('refuses a charged amount that does not match the agreed price', async () => {
            const pending = awaitingPayment(AGREED_PRICE);
            transactionRepo.findUnique
                .mockResolvedValueOnce(pending)
                .mockResolvedValueOnce(pending);
            stripeService.confirmPayment.mockResolvedValue({
                success: true,
                paymentIntent: { amount: AGREED_PRICE, currency: 'usd' },
            });

            await expect(
                service.confirmPayment('txn_1', BUYER, 'pi_1'),
            ).rejects.toThrow('Payment amount does not match the agreed price');
            expect(escrowService.hold).not.toHaveBeenCalled();
        });
    });
});
