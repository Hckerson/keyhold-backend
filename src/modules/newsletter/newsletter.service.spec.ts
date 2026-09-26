import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { createHash } from 'crypto';
import { NewsletterSubscriberRepo } from '@common/repos/newsletter-subscriber.repo';
import { EmailService } from '@common/services/email/email.service';
import { NewsletterStatus } from '@generated/prisma/enums';
import { NewsletterService } from './newsletter.service';
import { SubscribeNewsletterDto } from './dto';

const FRONTEND = 'https://keyhol.me';
const ADDRESS = 'reader@example.com';

interface Row {
    id: string;
    email: string;
    status: NewsletterStatus;
    confirmTokenHash: string | null;
    confirmExpiresAt: Date | null;
    unsubscribeTokenHash: string;
    consentText: string;
    source: string;
    consentedAt: Date;
    confirmedAt: Date | null;
    unsubscribedAt: Date | null;
}

type Where = Partial<Row>;

const matches = (row: Row, where: Where) =>
    Object.entries(where).every(([key, value]) =>
        Object.entries(row).some(
            ([field, current]) => field === key && current === value,
        ),
    );

interface SentConfirmation {
    to: string;
    confirmUrl: string;
    unsubscribeUrl: string;
}

const aSubscription: SubscribeNewsletterDto = {
    email: ADDRESS,
    consent: true,
    consentText: 'Occasional off-market notes. Unsubscribe any time.',
    source: 'footer',
};

const sha256 = (value: string) =>
    createHash('sha256').update(value).digest('hex');

describe('NewsletterService', () => {
    let service: NewsletterService;
    let rows: Row[];
    let repo: {
        findUnique: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
        updateMany: jest.Mock;
        deleteMany: jest.Mock;
    };
    let emailService: { sendNewsletterConfirmation: jest.Mock };
    let sent: SentConfirmation[];

    const tokenFrom = (field: 'confirmUrl' | 'unsubscribeUrl') => {
        const latest = sent.at(-1);
        if (!latest) return '';
        return new URL(latest[field]).searchParams.get('token') ?? '';
    };

    const rowFor = (email: string) => rows.find((row) => row.email === email);

    beforeEach(async () => {
        rows = [];
        sent = [];
        repo = {
            findUnique: jest.fn(({ where }: { where: Where }) =>
                Promise.resolve(
                    rows.find((row) => matches(row, where)) ?? null,
                ),
            ),
            create: jest.fn(({ data }: { data: Omit<Row, 'id'> }) => {
                const row = { id: `nls_${rows.length + 1}`, ...data };
                rows.push(row);
                return Promise.resolve(row);
            }),
            update: jest.fn(
                ({ where, data }: { where: Where; data: Partial<Row> }) => {
                    const index = rows.findIndex((row) => matches(row, where));
                    rows[index] = { ...rows[index], ...data };
                    return Promise.resolve(rows[index]);
                },
            ),
            deleteMany: jest.fn(() => Promise.resolve({ count: 0 })),
            updateMany: jest.fn(
                ({ where, data }: { where: Where; data: Partial<Row> }) => {
                    let count = 0;
                    rows = rows.map((row) => {
                        if (!matches(row, where)) return row;
                        count += 1;
                        return { ...row, ...data };
                    });
                    return Promise.resolve({ count });
                },
            ),
        };
        emailService = {
            sendNewsletterConfirmation: jest.fn(
                (confirmation: SentConfirmation) => {
                    sent.push(confirmation);
                    return Promise.resolve({ success: true });
                },
            ),
        };

        const moduleRef = await Test.createTestingModule({
            providers: [
                NewsletterService,
                { provide: NewsletterSubscriberRepo, useValue: repo },
                { provide: EmailService, useValue: emailService },
                {
                    provide: ConfigService,
                    useValue: { get: jest.fn().mockReturnValue(FRONTEND) },
                },
            ],
        }).compile();

        service = moduleRef.get(NewsletterService);
    });

    it('answers an address already on the list exactly as it answers a new one', async () => {
        const fresh = await service.subscribe(aSubscription);
        const pendingAgain = await service.subscribe(aSubscription);
        await service.confirm(tokenFrom('confirmUrl'));
        const confirmed = await service.subscribe(aSubscription);

        expect(pendingAgain).toEqual(fresh);
        expect(confirmed).toEqual(fresh);
    });

    it('sends a confirmed address no second email', async () => {
        await service.subscribe(aSubscription);
        await service.confirm(tokenFrom('confirmUrl'));
        emailService.sendNewsletterConfirmation.mockClear();

        await service.subscribe(aSubscription);

        expect(emailService.sendNewsletterConfirmation).not.toHaveBeenCalled();
    });

    it('stores only the hash of each token, never the token itself', async () => {
        await service.subscribe(aSubscription);
        const confirmToken = tokenFrom('confirmUrl');
        const unsubscribeToken = tokenFrom('unsubscribeUrl');
        const stored = Object.values(rowFor(ADDRESS) ?? {});

        expect(stored).not.toContain(confirmToken);
        expect(stored).not.toContain(unsubscribeToken);
        expect(rowFor(ADDRESS)?.confirmTokenHash).toBe(sha256(confirmToken));
        expect(rowFor(ADDRESS)?.unsubscribeTokenHash).toBe(
            sha256(unsubscribeToken),
        );
    });

    it('records the consent wording the person agreed to', async () => {
        await service.subscribe(aSubscription);

        expect(rowFor(ADDRESS)?.consentText).toBe(aSubscription.consentText);
        expect(rowFor(ADDRESS)?.consentedAt).toBeInstanceOf(Date);
    });

    it('moves a pending address to confirmed once', async () => {
        await service.subscribe(aSubscription);

        await expect(service.confirm(tokenFrom('confirmUrl'))).resolves.toEqual(
            { status: NewsletterStatus.CONFIRMED },
        );
        expect(rowFor(ADDRESS)).toMatchObject({
            status: NewsletterStatus.CONFIRMED,
            confirmTokenHash: null,
        });
        expect(rowFor(ADDRESS)?.confirmedAt).toBeInstanceOf(Date);
    });

    it('refuses a confirmation link that has already been used', async () => {
        await service.subscribe(aSubscription);
        const token = tokenFrom('confirmUrl');
        await service.confirm(token);

        await expect(service.confirm(token)).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it('refuses a confirmation link once it has expired', async () => {
        await service.subscribe(aSubscription);
        const row = rowFor(ADDRESS);
        if (row) row.confirmExpiresAt = new Date(Date.now() - 1);

        await expect(
            service.confirm(tokenFrom('confirmUrl')),
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(rowFor(ADDRESS)?.status).toBe(NewsletterStatus.PENDING);
    });

    it('deletes unconfirmed sign-ups whose link has expired whenever someone subscribes', async () => {
        await service.subscribe(aSubscription);

        expect(repo.deleteMany).toHaveBeenCalledWith({
            where: {
                status: NewsletterStatus.PENDING,
                confirmExpiresAt: { lt: expect.any(Date) },
            },
        });
    });

    it('treats a repeated unsubscribe as success without writing again', async () => {
        await service.subscribe(aSubscription);
        const token = tokenFrom('unsubscribeUrl');

        await service.unsubscribe(token);
        repo.update.mockClear();

        await expect(service.unsubscribe(token)).resolves.toEqual({
            status: NewsletterStatus.UNSUBSCRIBED,
        });
        expect(repo.update).not.toHaveBeenCalled();
        expect(rowFor(ADDRESS)?.status).toBe(NewsletterStatus.UNSUBSCRIBED);
    });

    it('requires fresh confirmation when an unsubscribed address signs up again', async () => {
        await service.subscribe(aSubscription);
        const firstConfirm = tokenFrom('confirmUrl');
        await service.confirm(firstConfirm);
        await service.unsubscribe(tokenFrom('unsubscribeUrl'));

        await service.subscribe(aSubscription);

        expect(rowFor(ADDRESS)?.status).toBe(NewsletterStatus.PENDING);
        expect(emailService.sendNewsletterConfirmation).toHaveBeenCalledTimes(
            2,
        );
        await expect(service.confirm(firstConfirm)).rejects.toBeInstanceOf(
            NotFoundException,
        );
        await service.confirm(tokenFrom('confirmUrl'));
        expect(rowFor(ADDRESS)?.status).toBe(NewsletterStatus.CONFIRMED);
    });

    it('tells the person when the confirmation email did not go', async () => {
        emailService.sendNewsletterConfirmation.mockResolvedValueOnce({
            success: false,
        });

        await expect(service.subscribe(aSubscription)).rejects.toBeInstanceOf(
            ServiceUnavailableException,
        );
    });
});
