import {
    BadRequestException,
    ForbiddenException,
    ServiceUnavailableException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ContactActivityRepo } from '@common/repos/contact-activity.repo';
import { ConnectionRepo } from '@common/repos/connection.repo';
import { SendGridEmailService } from '@common/services/email/sendgrid.service';
import { TwilioService } from '@common/services/notification/twilio.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { ConnectionStatus, ContactStatus } from '@generated/prisma/enums';
import { Prisma } from 'generated/prisma/client';
import { ContactService } from './contact.service';

const BUYER = 'usr_buyer';
const SELLER = 'usr_seller';
const STRANGER = 'usr_stranger';
const CONNECTION = 'con_1';
const CALL_SID = 'CA_1';

const aConnection = (overrides: Record<string, unknown> = {}) => ({
    id: CONNECTION,
    status: ConnectionStatus.PENDING,
    buyerId: BUYER,
    sellerId: SELLER,
    buyer: {
        id: BUYER,
        fullName: 'Ada Iwu',
        email: 'ada@example.com',
        phoneNumber: '+14155550123',
    },
    seller: {
        id: SELLER,
        fullName: 'Elena Voss',
        email: 'elena@example.com',
        phoneNumber: '+14155550999',
    },
    property: { id: 'prop_1', title: 'Rodeo Crest Penthouse' },
    ...overrides,
});

const anEmail = { subject: 'About your enquiry', body: 'Following up.' };

describe('ContactService', () => {
    let service: ContactService;
    let contactActivityRepo: {
        create: jest.Mock;
        update: jest.Mock;
        updateMany: jest.Mock;
        findMany: jest.Mock;
    };
    let connectionRepo: { findUnique: jest.Mock };
    let emailService: { sendAgentOutreach: jest.Mock };
    let twilioService: { createBridgedCall: jest.Mock; voiceEnabled: boolean };
    let notificationsService: { notify: jest.Mock };

    beforeEach(async () => {
        contactActivityRepo = {
            create: jest.fn().mockResolvedValue({ id: 'cta_1' }),
            update: jest
                .fn()
                .mockImplementation(
                    ({ data }: Prisma.ContactActivityUpdateArgs) => ({
                        id: 'cta_1',
                        ...data,
                    }),
                ),
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            findMany: jest.fn().mockResolvedValue([]),
        };
        connectionRepo = {
            findUnique: jest.fn().mockResolvedValue(aConnection()),
        };
        emailService = {
            sendAgentOutreach: jest.fn().mockResolvedValue({ success: true }),
        };
        twilioService = {
            createBridgedCall: jest
                .fn()
                .mockResolvedValue({ success: true, callSid: CALL_SID }),
            voiceEnabled: true,
        };
        notificationsService = { notify: jest.fn() };

        const moduleRef = await Test.createTestingModule({
            providers: [
                ContactService,
                {
                    provide: ContactActivityRepo,
                    useValue: contactActivityRepo,
                },
                { provide: ConnectionRepo, useValue: connectionRepo },
                { provide: SendGridEmailService, useValue: emailService },
                { provide: TwilioService, useValue: twilioService },
                {
                    provide: NotificationsService,
                    useValue: notificationsService,
                },
            ],
        }).compile();

        service = moduleRef.get(ContactService);
    });

    it('reaches a lead whose enquiry is still pending, unlike in-app messaging', async () => {
        const activity = await service.sendEmail(SELLER, CONNECTION, anEmail);

        expect(emailService.sendAgentOutreach).toHaveBeenCalled();
        expect(activity.status).toBe(ContactStatus.SENT);
    });

    it('refuses to contact a connection the caller is not party to', async () => {
        await expect(
            service.sendEmail(STRANGER, CONNECTION, anEmail),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('addresses the email to the buyer and points replies at the agent', async () => {
        await service.sendEmail(SELLER, CONNECTION, anEmail);

        expect(emailService.sendAgentOutreach).toHaveBeenCalledWith(
            expect.objectContaining({
                to: 'ada@example.com',
                replyTo: 'elena@example.com',
            }),
        );
    });

    it('records the touch as failed when the provider suppressed the email', async () => {
        emailService.sendAgentOutreach.mockResolvedValue({ success: false });

        const activity = await service.sendEmail(SELLER, CONNECTION, anEmail);

        expect(activity.status).toBe(ContactStatus.FAILED);
        expect(notificationsService.notify).not.toHaveBeenCalled();
    });

    it('rings the agent first so the lead never sees a personal number', async () => {
        const activity = await service.startCall(SELLER, CONNECTION);

        expect(twilioService.createBridgedCall).toHaveBeenCalledWith(
            expect.objectContaining({
                agentPhone: '+14155550999',
                leadPhone: '+14155550123',
            }),
        );
        expect(activity.providerRef).toBe(CALL_SID);
    });

    it('refuses to dial a number that is not in E.164 form', async () => {
        connectionRepo.findUnique.mockResolvedValue(
            aConnection({
                buyer: {
                    id: BUYER,
                    fullName: 'Ada Iwu',
                    email: 'ada@example.com',
                    phoneNumber: '(415) 555-0123',
                },
            }),
        );

        await expect(
            service.startCall(SELLER, CONNECTION),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(twilioService.createBridgedCall).not.toHaveBeenCalled();
    });

    it('refuses to place a call when voice is not configured', async () => {
        twilioService.voiceEnabled = false;

        await expect(
            service.startCall(SELLER, CONNECTION),
        ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('closes out the call activity when Twilio reports the outcome', async () => {
        await service.recordCallStatus(CALL_SID, 'completed', 96);

        expect(contactActivityRepo.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: {
                    status: ContactStatus.COMPLETED,
                    durationSeconds: 96,
                },
            }),
        );
    });

    it('ignores a call status it does not recognise', async () => {
        await service.recordCallStatus(CALL_SID, 'unheard-of');

        expect(contactActivityRepo.updateMany).not.toHaveBeenCalled();
    });
});
