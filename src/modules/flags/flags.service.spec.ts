import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FlagRepo } from '@common/repos/flag.repo';
import { MessageRepo } from '@common/repos/message.repo';
import { PropertyRepo } from '@common/repos/property.repo';
import { UserRepo } from '@common/repos/user.repo';
import { FlagStatus, FlagType } from '@generated/prisma/enums';
import { Prisma } from 'generated/prisma/client';
import { FlagsService } from './flags.service';

const REPORTER_WORDS = 'He asked me to wire the deposit to a personal account.';
const REVIEWER_NOTE = 'Suspended for thirty days after a second report.';

const aFlag = (overrides: Record<string, unknown> = {}) => ({
    id: 'flg_1',
    type: FlagType.USER,
    reason: 'Asked for a deposit off the platform',
    details: REPORTER_WORDS,
    resolutionNote: null,
    status: FlagStatus.ACTIVE,
    targetId: 'usr_9',
    creatorId: 'usr_3',
    resolvedAt: null,
    ...overrides,
});

describe('FlagsService', () => {
    let service: FlagsService;
    let flagRepo: {
        findUnique: jest.Mock;
        update: jest.Mock<unknown, [Prisma.FlagUpdateArgs]>;
    };

    beforeEach(async () => {
        flagRepo = {
            findUnique: jest.fn().mockResolvedValue(aFlag()),
            update: jest
                .fn()
                .mockImplementation(({ data }: Prisma.FlagUpdateArgs) => ({
                    ...aFlag(),
                    ...data,
                })),
        };

        const moduleRef = await Test.createTestingModule({
            providers: [
                FlagsService,
                { provide: FlagRepo, useValue: flagRepo },
                { provide: PropertyRepo, useValue: {} },
                { provide: UserRepo, useValue: {} },
                { provide: MessageRepo, useValue: {} },
            ],
        }).compile();

        service = moduleRef.get(FlagsService);
    });

    it("keeps the reporter's words and records the reviewer's note beside them", async () => {
        await service.settle('flg_1', FlagStatus.RESOLVED, {
            note: REVIEWER_NOTE,
        });

        const { data } = flagRepo.update.mock.calls[0][0];
        expect(data).not.toHaveProperty('details');
        expect(data).toMatchObject({
            status: FlagStatus.RESOLVED,
            resolutionNote: REVIEWER_NOTE,
        });
    });

    it('settles without a note and leaves the note empty', async () => {
        await service.settle('flg_1', FlagStatus.DISMISSED, {});

        const { data } = flagRepo.update.mock.calls[0][0];
        expect(data.resolutionNote).toBeUndefined();
        expect(data).not.toHaveProperty('details');
    });

    it('refuses to settle a report that is already settled', async () => {
        flagRepo.findUnique.mockResolvedValue(
            aFlag({ status: FlagStatus.DISMISSED }),
        );

        await expect(
            service.settle('flg_1', FlagStatus.RESOLVED, {}),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(flagRepo.update).not.toHaveBeenCalled();
    });
});
