import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { ConciergeRequestStatus } from '@generated/prisma/enums';
import { ConciergeClientRepo } from '@common/repos/concierge-client.repo';
import { ConciergeServiceRepo } from '@common/repos/concierge-service.repo';
import { ConciergeServiceRequestRepo } from '@common/repos/concierge-service-request.repo';
import { ConciergePracticeRepo } from '@common/repos/concierge-practice.repo';
import { ConciergePracticeCoverageRepo } from '@common/repos/concierge-practice-coverage.repo';
import {
    CreateConciergeClientDto,
    UpdateConciergeClientDto,
    CreateConciergeServiceDto,
    CreateConciergePracticeDto,
} from './dto';

const CLIENT_INCLUDE = {
    client: {
        select: { id: true, fullName: true, avatar: true, email: true },
    },
    _count: { select: { requests: true } },
} satisfies Prisma.ConciergeClientInclude;

type ConciergeClientRecord = Prisma.ConciergeClientGetPayload<{
    include: typeof CLIENT_INCLUDE;
}>;

const TIER_RANK: Record<string, number> = {
    PLATINUM: 3,
    VIP: 2,
    PREMIUM: 1,
};

const toNumber = (value: Prisma.Decimal) => value.toNumber();

const allocationPercent = (record: ConciergeClientRecord) => {
    const budget = toNumber(record.budget);
    if (budget <= 0) return 0;
    return Math.round((toNumber(record.allocated) / budget) * 100);
};

@Injectable()
export class ConciergeService {
    constructor(
        private conciergeClientRepo: ConciergeClientRepo,
        private conciergeServiceRepo: ConciergeServiceRepo,
        private conciergeServiceRequestRepo: ConciergeServiceRequestRepo,
        private conciergePracticeRepo: ConciergePracticeRepo,
        private conciergePracticeCoverageRepo: ConciergePracticeCoverageRepo,
    ) {}

    private shape(record: ConciergeClientRecord) {
        return {
            id: record.id,
            clientId: record.clientId,
            name: record.client.fullName,
            portrait: record.client.avatar,
            tier: record.tier,
            status: record.status,
            budget: toNumber(record.budget),
            allocated: toNumber(record.allocated),
            allocationPercent: allocationPercent(record),
            clientSince: record.clientSince,
            lastContact: record.lastContact,
            nextAction: record.nextAction,
            openRequests: record._count.requests,
        };
    }

    async findClients(agentId: string) {
        const records = await this.conciergeClientRepo.findMany({
            where: { agentId },
            include: CLIENT_INCLUDE,
        });

        return records
            .map((record) => this.shape(record))
            .sort(
                (a, b) =>
                    TIER_RANK[b.tier] - TIER_RANK[a.tier] ||
                    b.budget - a.budget,
            );
    }

    async findClient(agentId: string, id: string) {
        const record = await this.conciergeClientRepo.findFirst({
            where: { id, agentId },
            include: CLIENT_INCLUDE,
        });
        if (!record) {
            throw new NotFoundException(
                `Concierge client with ID ${id} not found`,
            );
        }
        return this.shape(record);
    }

    async createClient(agentId: string, dto: CreateConciergeClientDto) {
        return this.conciergeClientRepo.create({
            data: {
                agentId,
                clientId: dto.clientId,
                budget: new Prisma.Decimal(dto.budget),
                allocated: new Prisma.Decimal(dto.allocated ?? 0),
                clientSince: dto.clientSince,
                tier: dto.tier,
                status: dto.status,
                nextAction: dto.nextAction,
            },
        });
    }

    async updateClient(
        agentId: string,
        id: string,
        dto: UpdateConciergeClientDto,
    ) {
        await this.findClient(agentId, id);
        return this.conciergeClientRepo.update({
            where: { id },
            data: {
                budget:
                    dto.budget === undefined
                        ? undefined
                        : new Prisma.Decimal(dto.budget),
                allocated:
                    dto.allocated === undefined
                        ? undefined
                        : new Prisma.Decimal(dto.allocated),
                clientSince: dto.clientSince,
                tier: dto.tier,
                status: dto.status,
                nextAction: dto.nextAction,
            },
        });
    }

    async removeClient(agentId: string, id: string) {
        await this.findClient(agentId, id);
        return this.conciergeClientRepo.delete({ where: { id } });
    }

    async findServices(agentId: string) {
        const services = await this.conciergeServiceRepo.findMany({
            where: { agentId },
            include: {
                _count: {
                    select: {
                        requests: {
                            where: { status: ConciergeRequestStatus.OPEN },
                        },
                    },
                },
            },
            orderBy: { label: 'asc' },
        });

        return services.map((service) => ({
            id: service.id,
            key: service.key,
            label: service.label,
            capacity: service.capacity,
            openRequests: service._count.requests,
        }));
    }

    async createService(agentId: string, dto: CreateConciergeServiceDto) {
        return this.conciergeServiceRepo.upsert({
            where: { agentId_key: { agentId, key: dto.key } },
            create: { agentId, ...dto },
            update: { label: dto.label, capacity: dto.capacity },
        });
    }

    async findPractices(agentId: string) {
        const practices = await this.conciergePracticeRepo.findMany({
            where: { agentId },
            include: { _count: { select: { coverage: true } } },
            orderBy: { label: 'asc' },
        });

        return practices.map((practice) => ({
            id: practice.id,
            key: practice.key,
            label: practice.label,
            cadence: practice.cadence,
            covered: practice._count.coverage,
        }));
    }

    async createPractice(agentId: string, dto: CreateConciergePracticeDto) {
        return this.conciergePracticeRepo.upsert({
            where: { agentId_key: { agentId, key: dto.key } },
            create: { agentId, ...dto },
            update: { label: dto.label, cadence: dto.cadence },
        });
    }

    async coverPractice(agentId: string, practiceId: string, clientId: string) {
        const practice = await this.conciergePracticeRepo.findFirst({
            where: { id: practiceId, agentId },
        });
        if (!practice) {
            throw new NotFoundException(
                `Concierge practice with ID ${practiceId} not found`,
            );
        }
        await this.findClient(agentId, clientId);

        return this.conciergePracticeCoverageRepo.upsert({
            where: { practiceId_clientId: { practiceId, clientId } },
            create: { practiceId, clientId },
            update: {},
        });
    }

    async overview(agentId: string) {
        const [clients, services] = await Promise.all([
            this.findClients(agentId),
            this.findServices(agentId),
        ]);

        const bookValue = clients.reduce(
            (total, client) => total + client.budget,
            0,
        );
        const allocated = clients.reduce(
            (total, client) => total + client.allocated,
            0,
        );
        const openRequests = services.reduce(
            (total, service) => total + service.openRequests,
            0,
        );
        const closedDeals = await this.conciergeServiceRequestRepo.count({
            where: {
                client: { agentId },
                status: ConciergeRequestStatus.CLOSED,
            },
        });

        return {
            relationships: clients.length,
            bookValue,
            allocated,
            allocatedPercent:
                bookValue > 0 ? Math.round((allocated / bookValue) * 100) : 0,
            openRequests,
            closedDeals,
        };
    }
}
