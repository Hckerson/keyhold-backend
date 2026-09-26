import {
    Injectable,
    Logger,
    NotFoundException,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from 'generated/prisma/client';
import { NewsletterSubscriberRepo } from '@common/repos/newsletter-subscriber.repo';
import { EmailService } from '@common/services/email/email.service';
import { hashToken, issueToken } from '@common/services/crypto/token-hash';
import { NewsletterStatus } from '@generated/prisma/enums';
import {
    DEFAULT_FRONTEND_URL,
    NEWSLETTER_CONFIRM_PATH,
    NEWSLETTER_CONFIRM_TTL_MS,
    NEWSLETTER_UNSUBSCRIBE_PATH,
} from '@common/enums';
import { SubscribeNewsletterDto } from './dto';

export const SUBSCRIBE_ACCEPTED = {
    message: 'Check your inbox to confirm your subscription.',
};

const INVALID_CONFIRM_LINK =
    'This confirmation link is invalid or has already been used.';
const EXPIRED_CONFIRM_LINK =
    'This confirmation link has expired. Subscribe again to get a new one.';
const INVALID_UNSUBSCRIBE_LINK = 'This unsubscribe link is not recognised.';
const CONFIRMATION_UNSENT =
    'We could not send the confirmation email. Try again in a moment.';

const STATUS_SELECT = {
    id: true,
    status: true,
} satisfies Prisma.NewsletterSubscriberSelect;

const CONFIRM_SELECT = {
    ...STATUS_SELECT,
    confirmExpiresAt: true,
} satisfies Prisma.NewsletterSubscriberSelect;

@Injectable()
export class NewsletterService {
    private readonly logger = new Logger(NewsletterService.name);

    constructor(
        private newsletterSubscriberRepo: NewsletterSubscriberRepo,
        private emailService: EmailService,
        private configService: ConfigService,
    ) {}

    async subscribe(dto: SubscribeNewsletterDto) {
        await this.purgeExpiredSignups();

        const existing = await this.newsletterSubscriberRepo.findUnique({
            where: { email: dto.email },
            select: STATUS_SELECT,
        });

        if (existing?.status === NewsletterStatus.CONFIRMED) {
            return SUBSCRIBE_ACCEPTED;
        }

        const confirm = issueToken();
        const unsubscribe = issueToken();
        const pending = {
            status: NewsletterStatus.PENDING,
            confirmTokenHash: confirm.hash,
            confirmExpiresAt: new Date(Date.now() + NEWSLETTER_CONFIRM_TTL_MS),
            unsubscribeTokenHash: unsubscribe.hash,
            consentText: dto.consentText,
            source: dto.source,
            consentedAt: new Date(),
            confirmedAt: null,
            unsubscribedAt: null,
        };

        if (existing) {
            await this.newsletterSubscriberRepo.update({
                where: { id: existing.id },
                data: pending,
            });
        } else {
            await this.newsletterSubscriberRepo.create({
                data: { email: dto.email, ...pending },
            });
        }

        await this.sendConfirmation(
            dto.email,
            confirm.token,
            unsubscribe.token,
        );

        return SUBSCRIBE_ACCEPTED;
    }

    async confirm(token: string) {
        const record = await this.newsletterSubscriberRepo.findUnique({
            where: { confirmTokenHash: hashToken(token) },
            select: CONFIRM_SELECT,
        });

        if (!record || record.status !== NewsletterStatus.PENDING) {
            throw new NotFoundException(INVALID_CONFIRM_LINK);
        }

        if (!record.confirmExpiresAt || record.confirmExpiresAt <= new Date()) {
            throw new NotFoundException(EXPIRED_CONFIRM_LINK);
        }

        const { count } = await this.newsletterSubscriberRepo.updateMany({
            where: { id: record.id, status: NewsletterStatus.PENDING },
            data: {
                status: NewsletterStatus.CONFIRMED,
                confirmedAt: new Date(),
                confirmTokenHash: null,
                confirmExpiresAt: null,
            },
        });

        if (count === 0) throw new NotFoundException(INVALID_CONFIRM_LINK);

        return { status: NewsletterStatus.CONFIRMED };
    }

    async unsubscribe(token: string) {
        const record = await this.newsletterSubscriberRepo.findUnique({
            where: { unsubscribeTokenHash: hashToken(token) },
            select: STATUS_SELECT,
        });

        if (!record) throw new NotFoundException(INVALID_UNSUBSCRIBE_LINK);

        if (record.status !== NewsletterStatus.UNSUBSCRIBED) {
            await this.newsletterSubscriberRepo.update({
                where: { id: record.id },
                data: {
                    status: NewsletterStatus.UNSUBSCRIBED,
                    unsubscribedAt: new Date(),
                    confirmTokenHash: null,
                    confirmExpiresAt: null,
                },
            });
        }

        return { status: NewsletterStatus.UNSUBSCRIBED };
    }

    private purgeExpiredSignups() {
        return this.newsletterSubscriberRepo.deleteMany({
            where: {
                status: NewsletterStatus.PENDING,
                confirmExpiresAt: { lt: new Date() },
            },
        });
    }

    private async sendConfirmation(
        email: string,
        confirmToken: string,
        unsubscribeToken: string,
    ): Promise<void> {
        const frontendUrl =
            this.configService.get<string>('FRONTEND_URL') ??
            DEFAULT_FRONTEND_URL;
        const linkTo = (path: string, token: string) =>
            `${frontendUrl}${path}?token=${encodeURIComponent(token)}`;

        const delivered = await this.emailService
            .sendNewsletterConfirmation({
                to: email,
                confirmUrl: linkTo(NEWSLETTER_CONFIRM_PATH, confirmToken),
                unsubscribeUrl: linkTo(
                    NEWSLETTER_UNSUBSCRIBE_PATH,
                    unsubscribeToken,
                ),
            })
            .then(
                (delivery) => delivery.success,
                (error: unknown) => {
                    this.logger.error(
                        `Failed to send newsletter confirmation: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    );
                    return false;
                },
            );

        if (!delivered)
            throw new ServiceUnavailableException(CONFIRMATION_UNSENT);
    }
}
