import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { EmailService } from './email.service';

const mockSendMail = jest.fn();

jest.mock('nodemailer', () => ({
    createTransport: () => ({ sendMail: mockSendMail }),
}));

const SMTP_CONFIG: Record<string, string> = {
    'externalServices.smtp.host': 'smtp.resend.com',
    'externalServices.smtp.user': 'resend',
    'externalServices.smtp.password': 're_test',
    'externalServices.smtp.fromEmail': 'noreply@keyhol.me',
};

const SUBJECT = 'Purchase Completed: Cypress Point';

describe('EmailService.sendEmail', () => {
    let service: EmailService;

    beforeEach(async () => {
        mockSendMail.mockReset().mockResolvedValue({});

        const moduleRef = await Test.createTestingModule({
            providers: [
                EmailService,
                {
                    provide: ConfigService,
                    useValue: { get: (key: string) => SMTP_CONFIG[key] },
                },
            ],
        }).compile();

        service = moduleRef.get(EmailService);
    });

    it.each([
        'buyer@example.com',
        'agent@mail.example.org',
        'sarah@keyhol.test',
        'probe@host.invalid',
    ])('never hands %s to the provider', async (address) => {
        await expect(
            service.sendEmail({ to: address, subject: SUBJECT }),
        ).resolves.toEqual({ success: false });
        expect(mockSendMail).not.toHaveBeenCalled();
    });

    it.each(['ada@keyhol.me', 'ada@notexample.com', 'ada@contest.io'])(
        'delivers to %s, whose domain only resembles a reserved one',
        async (address) => {
            await expect(
                service.sendEmail({ to: address, subject: SUBJECT }),
            ).resolves.toEqual({ success: true });
            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({ to: [address] }),
            );
        },
    );

    it('still delivers to the real recipients of a list that names a reserved one', async () => {
        await expect(
            service.sendEmail({
                to: ['buyer@example.com', 'ada@keyhol.me'],
                subject: SUBJECT,
            }),
        ).resolves.toEqual({ success: true });
        expect(mockSendMail).toHaveBeenCalledWith(
            expect.objectContaining({ to: ['ada@keyhol.me'] }),
        );
    });
});
