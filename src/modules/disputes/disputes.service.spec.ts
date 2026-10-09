import { BadRequestException } from '@nestjs/common';
import { DisputeRepo } from '@common/repos/dispute.repo';
import { DisputeEvidenceRepo } from '@common/repos/dispute-evidence.repo';
import { TransactionRepo } from '@common/repos/transaction.repo';
import { DisputeOutcome } from '@common/enums';
import { EscrowService } from '@modules/escrow/escrow.service';
import {
    DisputeStatus,
    EscrowStatus,
    UserRole,
} from '@generated/prisma/enums';
import { DisputesService } from './disputes.service';

const NOTES = { resolutionNotes: 'Inspection failed' };
const ADMIN = 'usr_admin';

const hold = (id: string, status: EscrowStatus) => ({
    escrowHold: { id, status },
});

describe('DisputesService.settle', () => {
    let disputeRepo: { findUnique: jest.Mock; update: jest.Mock };
    let transactionRepo: { findMany: jest.Mock };
    let escrow: { release: jest.Mock; refund: jest.Mock; restoreHeld: jest.Mock };
    let service: DisputesService;

    const frozen = (...rows: ReturnType<typeof hold>[]) =>
        transactionRepo.findMany.mockResolvedValue(rows);

    beforeEach(() => {
        disputeRepo = {
            findUnique: jest.fn().mockResolvedValue({
                id: 'dsp_1',
                resolvedAt: null,
                transactions: [{ id: 'txn_1' }, { id: 'txn_2' }],
            }),
            update: jest.fn().mockResolvedValue({ id: 'dsp_1' }),
        };
        transactionRepo = { findMany: jest.fn() };
        escrow = {
            release: jest.fn().mockResolvedValue(undefined),
            refund: jest.fn().mockResolvedValue(undefined),
            restoreHeld: jest.fn().mockResolvedValue(undefined),
        };
        service = new DisputesService(
            disputeRepo as unknown as DisputeRepo,
            {} as DisputeEvidenceRepo,
            transactionRepo as unknown as TransactionRepo,
            escrow as unknown as EscrowService,
        );
    });

    it('S.1 refuses to resolve without an outcome when the dispute froze a hold', async () => {
        frozen(hold('esc_1', EscrowStatus.DISPUTED));

        await expect(
            service.settle('dsp_1', DisputeStatus.RESOLVED, NOTES, ADMIN),
        ).rejects.toThrow(BadRequestException);
        expect(escrow.release).not.toHaveBeenCalled();
        expect(disputeRepo.update).not.toHaveBeenCalled();
    });

    it('S.1 refuses to resolve without an outcome when no hold was frozen', async () => {
        frozen();

        await expect(
            service.settle('dsp_1', DisputeStatus.RESOLVED, NOTES, ADMIN),
        ).rejects.toThrow(BadRequestException);
        expect(disputeRepo.update).not.toHaveBeenCalled();
    });

    it('S.2 releases every frozen hold when told to release', async () => {
        frozen(
            hold('esc_1', EscrowStatus.DISPUTED),
            hold('esc_2', EscrowStatus.DISPUTED),
        );

        await service.settle(
            'dsp_1',
            DisputeStatus.RESOLVED,
            { ...NOTES, outcome: DisputeOutcome.RELEASE },
            ADMIN,
        );

        expect(escrow.release.mock.calls.map(([id]) => id)).toEqual([
            'esc_1',
            'esc_2',
        ]);
        expect(escrow.release).toHaveBeenCalledWith(
            'esc_1',
            ADMIN,
            UserRole.ADMIN,
            [EscrowStatus.DISPUTED, EscrowStatus.HELD],
        );
        expect(escrow.refund).not.toHaveBeenCalled();
    });

    it('S.2 refunds every frozen hold with the notes as the reason when told to refund', async () => {
        frozen(hold('esc_1', EscrowStatus.DISPUTED));

        await service.settle(
            'dsp_1',
            DisputeStatus.RESOLVED,
            { ...NOTES, outcome: DisputeOutcome.REFUND },
            ADMIN,
        );

        expect(escrow.refund).toHaveBeenCalledWith(
            'esc_1',
            { reason: NOTES.resolutionNotes },
            [EscrowStatus.DISPUTED, EscrowStatus.HELD],
        );
        expect(escrow.release).not.toHaveBeenCalled();
    });

    it('S.2 restores every frozen hold when the dispute is dismissed', async () => {
        frozen(
            hold('esc_1', EscrowStatus.DISPUTED),
            hold('esc_2', EscrowStatus.DISPUTED),
        );

        await service.settle('dsp_1', DisputeStatus.DISMISSED, NOTES, ADMIN);

        expect(escrow.restoreHeld.mock.calls.map(([id]) => id)).toEqual([
            'esc_1',
            'esc_2',
        ]);
        expect(escrow.release).not.toHaveBeenCalled();
        expect(escrow.refund).not.toHaveBeenCalled();
    });

    it('finishes a retried resolve by skipping the hold the first attempt already released', async () => {
        frozen(
            hold('esc_1', EscrowStatus.RELEASED),
            hold('esc_2', EscrowStatus.DISPUTED),
        );

        await service.settle(
            'dsp_1',
            DisputeStatus.RESOLVED,
            { ...NOTES, outcome: DisputeOutcome.RELEASE },
            ADMIN,
        );

        expect(escrow.release.mock.calls.map(([id]) => id)).toEqual(['esc_2']);
        expect(disputeRepo.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ status: DisputeStatus.RESOLVED }),
            }),
        );
    });

    it('refuses to settle a dispute that is already closed', async () => {
        disputeRepo.findUnique.mockResolvedValue({
            id: 'dsp_1',
            resolvedAt: new Date(),
            transactions: [],
        });

        await expect(
            service.settle('dsp_1', DisputeStatus.DISMISSED, NOTES, ADMIN),
        ).rejects.toThrow('This dispute is already closed');
        expect(escrow.restoreHeld).not.toHaveBeenCalled();
    });
});
