import { Test } from '@nestjs/testing';
import { UserSuspensionRepo } from '@common/repos/user-suspension.repo';
import { UserRepo } from '@common/repos/user.repo';
import { MS_PER_DAY } from '@common/enums';
import { UserAccountStatus } from '@generated/prisma/enums';
import { SuspensionsService } from './suspensions.service';

const daysAgo = (days: number) => new Date(Date.now() - days * MS_PER_DAY);

const aSuspension = (id: string, duration: number, startedDaysAgo: number) => ({
    id,
    userId: `usr_${id}`,
    duration,
    createdAt: daysAgo(startedDaysAgo),
    liftedAt: null,
});

describe('SuspensionsService.liftExpired', () => {
    let service: SuspensionsService;
    let suspensionRepo: {
        findMany: jest.Mock;
        findUnique: jest.Mock;
        update: jest.Mock;
    };
    let userRepo: { update: jest.Mock };

    beforeEach(async () => {
        const expired = aSuspension('expired', 7, 8);
        const running = aSuspension('running', 30, 2);

        suspensionRepo = {
            findMany: jest.fn().mockResolvedValue([expired, running]),
            findUnique: jest.fn(({ where }: { where: { id: string } }) =>
                [expired, running].find((entry) => entry.id === where.id),
            ),
            update: jest.fn(),
        };
        userRepo = { update: jest.fn() };

        const moduleRef = await Test.createTestingModule({
            providers: [
                SuspensionsService,
                { provide: UserSuspensionRepo, useValue: suspensionRepo },
                { provide: UserRepo, useValue: userRepo },
            ],
        }).compile();

        service = moduleRef.get(SuspensionsService);
    });

    it('reactivates an account whose timed suspension has run out', async () => {
        await service.liftExpired();

        expect(userRepo.update).toHaveBeenCalledWith({
            where: { id: 'usr_expired' },
            data: { status: UserAccountStatus.ACTIVE },
        });
    });

    it('leaves a suspension that still has days to run in force', async () => {
        await service.liftExpired();

        expect(userRepo.update).not.toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'usr_running' } }),
        );
        expect(suspensionRepo.update).toHaveBeenCalledTimes(1);
    });

    it('only considers timed suspensions that are still in force', async () => {
        await service.liftExpired();

        expect(suspensionRepo.findMany).toHaveBeenCalledWith({
            where: { liftedAt: null, duration: { not: null } },
        });
    });
});
