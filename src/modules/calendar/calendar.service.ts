import {
    HttpStatus,
    Injectable,
    Logger,
    ServiceUnavailableException,
} from '@nestjs/common';
import { AuthProvider } from '@generated/prisma/enums';
import { CalendarConnectionRepo } from '@common/repos/calendar-connection.repo';
import { ViewingRepo } from '@common/repos/viewing.repo';
import { TokenCipher } from '@common/services/crypto/token-cipher';
import { OAuthStateCodec } from '@common/services/oauth/oauth-state';
import { challengeFor, randomToken } from '@common/services/oauth/pkce';
import {
    CALENDAR_SCOPES,
    GoogleOAuthClient,
    GoogleTokenError,
} from '@common/services/oauth/google-oauth.client';
import { GoogleCalendarApi } from './google-calendar.api';

export const CALENDAR_CALLBACK_PATH = '/calendar/google/callback';

const MS_PER_MINUTE = 60 * 1000;
const VIEWING_SUMMARY = 'Viewing';
const BUYER_LABEL = 'Buyer';

export type CalendarConnectFailure = 'denied' | 'failed';

export class CalendarConnectError extends Error {
    constructor(readonly code: CalendarConnectFailure) {
        super(code);
    }
}

export interface CalendarStatus {
    available: boolean;
    connected: boolean;
    email: string | null;
}

export interface CalendarCallback {
    code?: string;
    state?: string;
    error?: string;
    sealed: string | null;
}

const messageOf = (error: unknown) =>
    error instanceof Error ? error.message : String(error);

@Injectable()
export class CalendarService {
    private readonly logger = new Logger(CalendarService.name);

    constructor(
        private readonly google: GoogleOAuthClient,
        private readonly codec: OAuthStateCodec,
        private readonly cipher: TokenCipher,
        private readonly api: GoogleCalendarApi,
        private readonly connectionRepo: CalendarConnectionRepo,
        private readonly viewingRepo: ViewingRepo,
    ) {}

    get available(): boolean {
        return this.google.enabled && this.cipher.enabled;
    }

    async status(userId: string): Promise<CalendarStatus> {
        const connection = await this.connectionRepo.findUnique({
            where: { userId },
            select: { googleEmail: true },
        });
        return {
            available: this.available,
            connected: connection !== null,
            email: connection?.googleEmail ?? null,
        };
    }

    beginConnect(userId: string): { url: string; sealed: string } {
        if (!this.available) {
            throw new ServiceUnavailableException(
                'Calendar sync is not configured',
            );
        }

        const state = randomToken();
        const nonce = randomToken();
        const verifier = randomToken();
        const sealed = this.codec.seal({
            state,
            nonce,
            verifier,
            provider: AuthProvider.GOOGLE,
            purpose: 'calendar',
            userId,
        });
        const url = this.google.authorizeUrl(
            CALENDAR_CALLBACK_PATH,
            { state, nonce, challenge: challengeFor(verifier) },
            CALENDAR_SCOPES,
            true,
        );

        return { url, sealed };
    }

    async completeConnect(callback: CalendarCallback): Promise<void> {
        if (callback.error) throw new CalendarConnectError('denied');

        const saved = this.codec.open(callback.sealed, callback.state);
        if (
            !saved ||
            saved.purpose !== 'calendar' ||
            !saved.userId ||
            !callback.code
        ) {
            throw new CalendarConnectError('failed');
        }

        const tokens = await this.google.exchange(
            CALENDAR_CALLBACK_PATH,
            callback.code,
            saved.verifier,
        );
        if (!tokens.refresh_token) throw new CalendarConnectError('failed');

        const googleEmail = tokens.id_token
            ? (await this.google.profileFrom(tokens.id_token, saved.nonce))
                  .email
            : null;
        const refreshToken = this.cipher.encrypt(tokens.refresh_token);

        await this.connectionRepo.upsert({
            where: { userId: saved.userId },
            create: { userId: saved.userId, refreshToken, googleEmail },
            update: { refreshToken, googleEmail },
        });
    }

    async disconnect(userId: string): Promise<void> {
        const connection = await this.connectionRepo.findUnique({
            where: { userId },
        });
        if (!connection) return;

        await this.connectionRepo.deleteMany({ where: { userId } });

        try {
            await this.google.revoke(
                this.cipher.decrypt(connection.refreshToken),
            );
        } catch (error) {
            this.logger.warn(
                `Could not revoke the Google grant for ${userId}: ${messageOf(error)}`,
            );
        }
    }

    async pushViewing(viewingId: string): Promise<void> {
        try {
            const viewing = await this.viewingRepo.findUnique({
                where: { id: viewingId },
                include: {
                    property: {
                        select: { title: true, address: true, locality: true },
                    },
                    requestedBy: { select: { fullName: true } },
                    connection: { select: { sellerId: true } },
                },
            });
            if (!viewing?.confirmedTime) return;

            const session = await this.sessionFor(viewing.connection.sellerId);
            if (!session) return;

            const start = viewing.confirmedTime;
            const eventId = await this.api.upsert(
                session.accessToken,
                session.calendarId,
                {
                    summary: `${VIEWING_SUMMARY} · ${viewing.property.title}`,
                    location: `${viewing.property.address}, ${viewing.property.locality}`,
                    description: `${BUYER_LABEL}: ${viewing.requestedBy.fullName}`,
                    start,
                    end: new Date(
                        start.getTime() +
                            viewing.durationMinutes * MS_PER_MINUTE,
                    ),
                },
                viewing.googleEventId,
            );

            if (eventId !== viewing.googleEventId) {
                await this.viewingRepo.update({
                    where: { id: viewingId },
                    data: { googleEventId: eventId },
                });
            }
        } catch (error) {
            this.logger.warn(
                `Calendar push failed for viewing ${viewingId}: ${messageOf(error)}`,
            );
        }
    }

    async removeViewing(viewingId: string): Promise<void> {
        try {
            const viewing = await this.viewingRepo.findUnique({
                where: { id: viewingId },
                include: { connection: { select: { sellerId: true } } },
            });
            if (!viewing?.googleEventId) return;

            const session = await this.sessionFor(viewing.connection.sellerId);
            if (session) {
                await this.api.remove(
                    session.accessToken,
                    session.calendarId,
                    viewing.googleEventId,
                );
            }

            await this.viewingRepo.update({
                where: { id: viewingId },
                data: { googleEventId: null },
            });
        } catch (error) {
            this.logger.warn(
                `Calendar removal failed for viewing ${viewingId}: ${messageOf(error)}`,
            );
        }
    }

    private async sessionFor(
        userId: string,
    ): Promise<{ accessToken: string; calendarId: string } | null> {
        if (!this.available) return null;

        const connection = await this.connectionRepo.findUnique({
            where: { userId },
        });
        if (!connection) return null;

        const accessToken = await this.refreshOrForget(
            userId,
            connection.refreshToken,
        );
        return accessToken
            ? { accessToken, calendarId: connection.calendarId }
            : null;
    }

    private async refreshOrForget(
        userId: string,
        sealedRefreshToken: string,
    ): Promise<string | null> {
        try {
            return await this.google.refresh(
                this.cipher.decrypt(sealedRefreshToken),
            );
        } catch (error) {
            if (
                error instanceof GoogleTokenError &&
                error.status === HttpStatus.BAD_REQUEST
            ) {
                await this.connectionRepo.deleteMany({ where: { userId } });
                return null;
            }
            throw error;
        }
    }
}
