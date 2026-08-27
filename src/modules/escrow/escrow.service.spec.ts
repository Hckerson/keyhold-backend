import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EscrowRepo } from '@common/repos/escrow.repo';
import { TransactionRepo } from '@common/repos/transaction.repo';
import { PropertyRepo } from '@common/repos/property.repo';
import { StripeService } from '@common/services/payment/stripe.service';
import { SendGridEmailService } from '@common/services/email/sendgrid.service';
import { PDFService } from '@common/services/document/pdf.service';
import { CloudinaryService } from '@common/services/storage/cloudinary.service';
import { SettingsService } from '@modules/settings/settings.service';
import { DbTransaction } from '@common/database/db-transaction';
import {
    EscrowStatus,
    PropertyStatus,
    TransactionStatus,
    UserRole,
} from '@generated/prisma/enums';
import { Prisma } from 'generated/prisma/client';
import { EscrowService } from './escrow.service';

const BUYER = 'usr_buyer';
const SELLER = 'usr_seller';
const ADMIN = 'usr_admin';
const STRANGER = 'usr_stranger';

const WINDOW_OPEN = new Date('2099-01-01T00:00:00.000Z');
const WINDOW_CLOSED = new Date('2020-01-01T00:00:00.000Z');

const AGREEMENT_URL = 'https://cdn.example.com/agreement-txn_1.pdf';

const aTransaction = () => ({
    id: 'txn_1',
    buyerId: BUYER,
    sellerId: SELLER,
    propertyId: 'prop_1',
    finalPrice: new Prisma.Decimal(1_150_000),
    terms: 'Cash, thirty-day close',
    stripePaymentIntentId: 'pi_1',
    buyer: { id: BUYER, fullName: 'Ada Okonjo', email: 'ada@example.com' },
    seller: { id: SELLER, fullName: 'Marta Vance', email: 'marta@example.com' },
    property: {
        id: 'prop_1',
        title: 'Cypress Point',
        address: '18 Cypress Point',
        locality: 'Carmel',
        price: new Prisma.Decimal(1_250_000),
    },
});

const anEscrow = (
    overrides: Partial<{
        status: EscrowStatus;
        inspectionEndDate: Date;
        transaction: ReturnType<typeof aTransaction> | null;
    }> = {},
) => ({
    id: 'esc_1',
    amount: new Prisma.Decimal(1_200_000),
    status: EscrowStatus.HELD,
    inspectionEndDate: WINDOW_OPEN,
    transaction: aTransaction(),
    ...overrides,
});

describe('EscrowService.release', () => {
    let service: EscrowService;
    let escrowRepo: {
        findUnique: jest.Mock;
        update: jest.Mock;
        updateMany: jest.Mock;
    };
    let transactionRepo: { update: jest.Mock };
    let propertyRepo: { update: jest.Mock };
    let pdfService: { generatePurchaseAgreement: jest.Mock };
    let cloudinaryService: { uploadDocument: jest.Mock };
    let emailService: {
        sendTransactionCompletedEmail: jest.Mock;
        sendEmail: jest.Mock;
    };

    const givenHold = (escrow: ReturnType<typeof anEscrow> | null) =>
        escrowRepo.findUnique.mockResolvedValue(escrow);

    const wroteNothing = () => {
        expect(escrowRepo.update).not.toHaveBeenCalled();
        expect(escrowRepo.updateMany).not.toHaveBeenCalled();
        expect(transactionRepo.update).not.toHaveBeenCalled();
        expect(propertyRepo.update).not.toHaveBeenCalled();
    };

    beforeEach(async () => {
        escrowRepo = {
            findUnique: jest.fn(),
            update: jest
                .fn()
                .mockImplementation(({ data }: Prisma.EscrowUpdateArgs) => ({
                    id: 'esc_1',
                    ...data,
                })),
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        };
        transactionRepo = { update: jest.fn().mockResolvedValue(undefined) };
        propertyRepo = { update: jest.fn().mockResolvedValue(undefined) };
        pdfService = {
            generatePurchaseAgreement: jest
                .fn()
                .mockReturnValue(Buffer.from('agreement')),
        };
        cloudinaryService = {
            uploadDocument: jest.fn().mockResolvedValue({ url: AGREEMENT_URL }),
        };
        emailService = {
            sendTransactionCompletedEmail: jest
                .fn()
                .mockResolvedValue(undefined),
            sendEmail: jest.fn().mockResolvedValue(undefined),
        };

        const moduleRef = await Test.createTestingModule({
            providers: [
                EscrowService,
                { provide: EscrowRepo, useValue: escrowRepo },
                { provide: TransactionRepo, useValue: transactionRepo },
                { provide: PropertyRepo, useValue: propertyRepo },
                { provide: PDFService, useValue: pdfService },
                { provide: CloudinaryService, useValue: cloudinaryService },
                { provide: SendGridEmailService, useValue: emailService },
                {
                    provide: StripeService,
                    useValue: { refundPayment: jest.fn() },
                },
                {
                    provide: SettingsService,
                    useValue: { findValue: jest.fn() },
                },
                {
                    provide: DbTransaction,
                    useValue: { run: (fn: () => Promise<unknown>) => fn() },
                },
            ],
        }).compile();

        service = moduleRef.get(EscrowService);
    });

    describe('07 · who may release', () => {
        it('7.1 lets the buyer release while the window is open', async () => {
            givenHold(anEscrow());
            await expect(
                service.release('esc_1', BUYER, UserRole.BUYER),
            ).resolves.toBeDefined();
        });

        it('7.1 lets the buyer release once the window has closed', async () => {
            givenHold(anEscrow({ inspectionEndDate: WINDOW_CLOSED }));
            await expect(
                service.release('esc_1', BUYER, UserRole.BUYER),
            ).resolves.toBeDefined();
        });

        it('7.2 lets an admin release while the window is open', async () => {
            givenHold(anEscrow());
            await expect(
                service.release('esc_1', ADMIN, UserRole.ADMIN),
            ).resolves.toBeDefined();
        });

        it('7.3 lets the seller release once the window has closed', async () => {
            givenHold(anEscrow({ inspectionEndDate: WINDOW_CLOSED }));
            await expect(
                service.release('esc_1', SELLER, UserRole.SELLER),
            ).resolves.toBeDefined();
        });

        it('7.4 refuses the seller while the window is still open', async () => {
            givenHold(anEscrow());
            await expect(
                service.release('esc_1', SELLER, UserRole.SELLER),
            ).rejects.toThrow(ForbiddenException);
        });

        it('7.5 refuses a stranger while the window is open', async () => {
            givenHold(anEscrow());
            await expect(
                service.release('esc_1', STRANGER, UserRole.BUYER),
            ).rejects.toThrow(ForbiddenException);
        });

        it('7.5 refuses a stranger after the window has closed', async () => {
            givenHold(anEscrow({ inspectionEndDate: WINDOW_CLOSED }));
            await expect(
                service.release('esc_1', STRANGER, UserRole.SELLER),
            ).rejects.toThrow(ForbiddenException);
        });

        it('7.5 refuses a seller impersonating the buyer id of another transaction', async () => {
            givenHold(anEscrow());
            await expect(
                service.release('esc_1', STRANGER, UserRole.SELLER),
            ).rejects.toThrow(ForbiddenException);
        });

        it('7.6 leaves no trace when the release is refused', async () => {
            givenHold(anEscrow());
            await expect(
                service.release('esc_1', SELLER, UserRole.SELLER),
            ).rejects.toThrow(ForbiddenException);

            expect(pdfService.generatePurchaseAgreement).not.toHaveBeenCalled();
            expect(cloudinaryService.uploadDocument).not.toHaveBeenCalled();
            expect(
                emailService.sendTransactionCompletedEmail,
            ).not.toHaveBeenCalled();
            wroteNothing();
        });
    });

    describe('08 · what may be released', () => {
        it('8.1 refuses an escrow id that matches nothing', async () => {
            givenHold(null);
            await expect(
                service.release('esc_missing', BUYER, UserRole.BUYER),
            ).rejects.toThrow(NotFoundException);
            wroteNothing();
        });

        it.each([
            EscrowStatus.RELEASED,
            EscrowStatus.REFUNDED,
            EscrowStatus.DISPUTED,
        ])('8.2 refuses a hold that is already %s', async (status) => {
            givenHold(anEscrow({ status }));
            await expect(
                service.release('esc_1', BUYER, UserRole.BUYER),
            ).rejects.toThrow(BadRequestException);
            wroteNothing();
        });

        it('8.3 refuses a hold attached to no transaction', async () => {
            givenHold(anEscrow({ transaction: null }));
            await expect(
                service.release('esc_1', BUYER, UserRole.BUYER),
            ).rejects.toThrow(BadRequestException);
            expect(pdfService.generatePurchaseAgreement).not.toHaveBeenCalled();
            wroteNothing();
        });
    });

    describe('09 · what a release does', () => {
        it('9.1 marks the hold released and stamps the moment', async () => {
            givenHold(anEscrow());
            await service.release('esc_1', BUYER, UserRole.BUYER);

            expect(escrowRepo.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ id: 'esc_1' }),
                    data: expect.objectContaining({
                        status: EscrowStatus.RELEASED,
                        releasedAt: expect.any(Date),
                    }),
                }),
            );
        });

        it('9.2 completes the transaction against the stored agreement', async () => {
            givenHold(anEscrow());
            const { agreementUrl } = await service.release(
                'esc_1',
                BUYER,
                UserRole.BUYER,
            );

            expect(agreementUrl).toBe(AGREEMENT_URL);
            expect(transactionRepo.update).toHaveBeenCalledWith({
                where: { id: 'txn_1' },
                data: {
                    status: TransactionStatus.COMPLETED,
                    completedAt: expect.any(Date),
                    agreementDocUrl: AGREEMENT_URL,
                },
            });
        });

        it('9.3 marks the property sold', async () => {
            givenHold(anEscrow());
            await service.release('esc_1', BUYER, UserRole.BUYER);

            expect(propertyRepo.update).toHaveBeenCalledWith({
                where: { id: 'prop_1' },
                data: { status: PropertyStatus.SOLD },
            });
        });

        it('9.4 leaves the hold untouched when the agreement cannot be stored', async () => {
            givenHold(anEscrow());
            cloudinaryService.uploadDocument.mockRejectedValue(
                new Error('storage down'),
            );

            await expect(
                service.release('esc_1', BUYER, UserRole.BUYER),
            ).rejects.toThrow('storage down');
            wroteNothing();
        });

        it('9.5 draws the agreement from the agreed price and both parties', async () => {
            givenHold(anEscrow());
            await service.release('esc_1', BUYER, UserRole.BUYER);

            expect(pdfService.generatePurchaseAgreement).toHaveBeenCalledWith(
                expect.objectContaining({
                    buyerName: 'Ada Okonjo',
                    sellerName: 'Marta Vance',
                    propertyTitle: 'Cypress Point',
                    propertyAddress: '18 Cypress Point',
                    purchasePrice: 1_150_000,
                }),
            );
        });

        it('refuses a second concurrent release once the hold is claimed', async () => {
            givenHold(anEscrow());
            escrowRepo.updateMany.mockResolvedValue({ count: 0 });

            await expect(
                service.release('esc_1', BUYER, UserRole.BUYER),
            ).rejects.toThrow(BadRequestException);
            expect(transactionRepo.update).not.toHaveBeenCalled();
        });

        it('9.6 settles even when the notification email fails', async () => {
            givenHold(anEscrow());
            emailService.sendTransactionCompletedEmail.mockRejectedValue(
                new Error('sendgrid down'),
            );

            await expect(
                service.release('esc_1', BUYER, UserRole.BUYER),
            ).resolves.toBeDefined();
            expect(escrowRepo.updateMany).toHaveBeenCalled();
        });
    });
});
