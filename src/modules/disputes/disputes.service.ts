import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { DisputeRepo } from '@common/repos/dispute.repo';
import { DisputeEvidenceRepo } from '@common/repos/dispute-evidence.repo';
import { TransactionRepo } from '@common/repos/transaction.repo';
import { EscrowService } from '@modules/escrow/escrow.service';
import { DisputeStatus, UserRole } from '@generated/prisma/enums';
import {
    AddEvidenceDto,
    CreateDisputeDto,
    QueryDisputeDto,
    ResolveDisputeDto,
} from './dto';

const DEFAULT_LIMIT = 20;

const DISPUTE_INCLUDE = {
    initiator: { select: { id: true, fullName: true, email: true } },
    evidence: { orderBy: { createdAt: 'asc' } },
    transactions: {
        select: {
            id: true,
            finalPrice: true,
            status: true,
            escrowHoldId: true,
            property: { select: { id: true, title: true, address: true } },
        },
    },
} satisfies Prisma.DisputeInclude;

@Injectable()
export class DisputesService {
    constructor(
        private disputeRepo: DisputeRepo,
        private evidenceRepo: DisputeEvidenceRepo,
        private transactionRepo: TransactionRepo,
        private escrowService: EscrowService,
    ) {}

    async create(initiatorId: string, createDto: CreateDisputeDto) {
        const transaction = createDto.transactionId
            ? await this.requireParty(createDto.transactionId, initiatorId)
            : null;

        const dispute = await this.disputeRepo.create({
            data: {
                initiatorId,
                title: createDto.title,
                description: createDto.description,
                status: DisputeStatus.OPEN,
            },
            include: DISPUTE_INCLUDE,
        });

        if (transaction) {
            await this.transactionRepo.update({
                where: { id: transaction.id },
                data: { disputeId: dispute.id },
            });

            if (transaction.escrowHoldId) {
                await this.escrowService.markDisputed(transaction.escrowHoldId);
            }
        }

        return dispute;
    }

    async findAll(query: QueryDisputeDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? DEFAULT_LIMIT;
        const where: Prisma.DisputeWhereInput = { status: query.status };

        const [items, total] = await Promise.all([
            this.disputeRepo.findMany({
                where,
                include: DISPUTE_INCLUDE,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.disputeRepo.count({ where }),
        ]);

        return {
            items,
            total,
            page,
            limit,
            pageCount: Math.max(1, Math.ceil(total / limit)),
        };
    }

    async findMine(initiatorId: string) {
        return this.disputeRepo.findMany({
            where: { initiatorId },
            include: DISPUTE_INCLUDE,
            orderBy: { createdAt: 'desc' },
        });
    }

    async counts() {
        const statuses = [
            DisputeStatus.OPEN,
            DisputeStatus.PENDING_REVIEW,
            DisputeStatus.RESOLVED,
            DisputeStatus.DISMISSED,
        ];

        const counted = await Promise.all(
            statuses.map(async (status) => ({
                status,
                count: await this.disputeRepo.count({ where: { status } }),
            })),
        );

        const byStatus = counted.reduce<Record<DisputeStatus, number>>(
            (totals, row) => ({ ...totals, [row.status]: row.count }),
            {
                [DisputeStatus.OPEN]: 0,
                [DisputeStatus.PENDING_REVIEW]: 0,
                [DisputeStatus.RESOLVED]: 0,
                [DisputeStatus.DISMISSED]: 0,
            },
        );

        const oldest = await this.disputeRepo.findFirst({
            where: { status: DisputeStatus.OPEN },
            orderBy: { createdAt: 'asc' },
            select: { createdAt: true },
        });

        return {
            byStatus,
            oldestOpenAt: oldest?.createdAt ?? null,
        };
    }

    async findOne(id: string, actorId: string, actorRole: UserRole) {
        const dispute = await this.disputeRepo.findUnique({
            where: { id },
            include: DISPUTE_INCLUDE,
        });
        if (!dispute) throw new NotFoundException('Dispute not found');

        if (dispute.initiatorId !== actorId && actorRole !== UserRole.ADMIN) {
            throw new ForbiddenException('You cannot view this dispute');
        }

        return dispute;
    }

    async addEvidence(
        id: string,
        actorId: string,
        evidenceDto: AddEvidenceDto,
    ) {
        const dispute = await this.disputeRepo.findUnique({ where: { id } });
        if (!dispute) throw new NotFoundException('Dispute not found');

        if (dispute.initiatorId !== actorId) {
            throw new ForbiddenException('Only the initiator can add evidence');
        }

        if (dispute.resolvedAt) {
            throw new BadRequestException('This dispute is already closed');
        }

        return this.evidenceRepo.create({
            data: {
                disputeId: id,
                type: evidenceDto.type,
                content: evidenceDto.content,
                label: evidenceDto.label,
            },
        });
    }

    async settle(
        id: string,
        status: DisputeStatus,
        resolveDto: ResolveDisputeDto,
    ) {
        const dispute = await this.disputeRepo.findUnique({ where: { id } });
        if (!dispute) throw new NotFoundException('Dispute not found');

        if (dispute.resolvedAt) {
            throw new BadRequestException('This dispute is already closed');
        }

        return this.disputeRepo.update({
            where: { id },
            data: {
                status,
                resolutionNotes: resolveDto.resolutionNotes,
                resolvedAt: new Date(),
            },
            include: DISPUTE_INCLUDE,
        });
    }

    private async requireParty(transactionId: string, actorId: string) {
        const transaction = await this.transactionRepo.findUnique({
            where: { id: transactionId },
            select: {
                id: true,
                buyerId: true,
                sellerId: true,
                escrowHoldId: true,
            },
        });
        if (!transaction) throw new NotFoundException('Transaction not found');

        if (
            transaction.buyerId !== actorId &&
            transaction.sellerId !== actorId
        ) {
            throw new ForbiddenException(
                'You are not part of this transaction',
            );
        }

        return transaction;
    }
}
