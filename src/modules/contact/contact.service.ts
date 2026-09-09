import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { ContactActivityRepo } from '@common/repos/contact-activity.repo';
import { ConnectionRepo } from '@common/repos/connection.repo';
import { EmailService } from '@common/services/email/email.service';
import { TwilioService } from '@common/services/notification/twilio.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import {
    ContactChannel,
    ContactDirection,
    ContactStatus,
    NotificationType,
} from '@generated/prisma/enums';
import { E164_PATTERN } from '@common/enums';
import { assertConnectionParty } from '@common/access';
import { SendLeadEmailDto } from './dto';

const CONNECTION_ENTITY = 'CONNECTION';
const HISTORY_DEPTH = 50;

const PARTY_SELECT = {
    id: true,
    fullName: true,
    email: true,
    phoneNumber: true,
} satisfies Prisma.UserSelect;

const contactInclude = {
    buyer: { select: PARTY_SELECT },
    seller: { select: PARTY_SELECT },
    property: { select: { id: true, title: true } },
} satisfies Prisma.ConnectionInclude;

const CALL_STATUS: Record<string, ContactStatus> = {
    queued: ContactStatus.QUEUED,
    initiated: ContactStatus.RINGING,
    ringing: ContactStatus.RINGING,
    'in-progress': ContactStatus.RINGING,
    completed: ContactStatus.COMPLETED,
    'no-answer': ContactStatus.NO_ANSWER,
    busy: ContactStatus.FAILED,
    failed: ContactStatus.FAILED,
    canceled: ContactStatus.FAILED,
};

@Injectable()
export class ContactService {
    constructor(
        private contactActivityRepo: ContactActivityRepo,
        private connectionRepo: ConnectionRepo,
        private emailService: EmailService,
        private twilioService: TwilioService,
        private notificationsService: NotificationsService,
    ) {}

    private async loadParties(connectionId: string, userId: string) {
        const connection = await this.connectionRepo.findUnique({
            where: { id: connectionId },
            include: contactInclude,
        });
        if (!connection) throw new NotFoundException('Connection not found');

        assertConnectionParty(connection, userId);

        const actorIsSeller = connection.sellerId === userId;

        return {
            connection,
            actor: actorIsSeller ? connection.seller : connection.buyer,
            recipient: actorIsSeller ? connection.buyer : connection.seller,
        };
    }

    async history(connectionId: string, userId: string) {
        await this.loadParties(connectionId, userId);

        return this.contactActivityRepo.findMany({
            where: { connectionId },
            orderBy: { occurredAt: 'desc' },
            take: HISTORY_DEPTH,
        });
    }

    async sendEmail(
        userId: string,
        connectionId: string,
        dto: SendLeadEmailDto,
    ) {
        const { connection, actor, recipient } = await this.loadParties(
            connectionId,
            userId,
        );

        if (!recipient.email) {
            throw new BadRequestException(
                'This contact has no email address on file',
            );
        }

        const activity = await this.contactActivityRepo.create({
            data: {
                connectionId,
                actorId: userId,
                channel: ContactChannel.EMAIL,
                direction: ContactDirection.OUTBOUND,
                status: ContactStatus.QUEUED,
                subject: dto.subject,
                body: dto.body,
            },
        });

        const delivery = await this.emailService.sendAgentOutreach({
            to: recipient.email,
            replyTo: actor.email,
            subject: dto.subject,
            body: dto.body,
            agentName: actor.fullName,
            propertyTitle: connection.property.title,
        });

        if (delivery.success) {
            await this.notificationsService.notify({
                userId: recipient.id,
                type: NotificationType.MESSAGE_RECEIVED,
                title: `New email from ${actor.fullName}`,
                body: dto.subject,
                entityType: CONNECTION_ENTITY,
                entityId: connectionId,
            });
        }

        return this.contactActivityRepo.update({
            where: { id: activity.id },
            data: {
                status: delivery.success
                    ? ContactStatus.SENT
                    : ContactStatus.FAILED,
            },
        });
    }

    async startCall(userId: string, connectionId: string) {
        const { connection, actor, recipient } = await this.loadParties(
            connectionId,
            userId,
        );

        if (!this.twilioService.voiceEnabled) {
            throw new ServiceUnavailableException(
                'Calling is not configured on this environment',
            );
        }

        const agentPhone = this.assertDialable(
            actor.phoneNumber,
            'Add a phone number to your profile before placing a call',
        );
        const leadPhone = this.assertDialable(
            recipient.phoneNumber,
            'This contact has no dialable phone number on file',
        );

        const activity = await this.contactActivityRepo.create({
            data: {
                connectionId,
                actorId: userId,
                channel: ContactChannel.CALL,
                direction: ContactDirection.OUTBOUND,
                status: ContactStatus.QUEUED,
                subject: connection.property.title,
            },
        });

        const call = await this.twilioService.createBridgedCall({
            agentPhone,
            leadPhone,
            announcement: `Connecting you to ${recipient.fullName} about ${connection.property.title}.`,
        });

        return this.contactActivityRepo.update({
            where: { id: activity.id },
            data: {
                providerRef: call.callSid,
                status: ContactStatus.RINGING,
            },
        });
    }

    async recordCallStatus(
        callSid: string,
        callStatus: string,
        durationSeconds?: number,
    ) {
        const status = CALL_STATUS[callStatus];
        if (!status) return;

        await this.contactActivityRepo.updateMany({
            where: { providerRef: callSid, channel: ContactChannel.CALL },
            data: {
                status,
                ...(durationSeconds === undefined ? {} : { durationSeconds }),
            },
        });
    }

    private assertDialable(phone: string | null, message: string): string {
        if (!phone || !E164_PATTERN.test(phone)) {
            throw new BadRequestException(message);
        }
        return phone;
    }
}
