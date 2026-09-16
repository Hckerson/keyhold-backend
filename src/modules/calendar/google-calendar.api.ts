import { HttpStatus, Injectable } from '@nestjs/common';
import { z } from 'zod';

const EVENTS_BASE = 'https://www.googleapis.com/calendar/v3/calendars';
const MISSING_STATUSES: number[] = [HttpStatus.NOT_FOUND, HttpStatus.GONE];

const eventSchema = z.object({ id: z.string().min(1) });

export interface CalendarEventInput {
    summary: string;
    location: string;
    description: string;
    start: Date;
    end: Date;
}

export class CalendarApiError extends Error {}

const eventsUrl = (calendarId: string, eventId?: string) =>
    `${EVENTS_BASE}/${encodeURIComponent(calendarId)}/events${
        eventId ? `/${encodeURIComponent(eventId)}` : ''
    }`;

@Injectable()
export class GoogleCalendarApi {
    async upsert(
        accessToken: string,
        calendarId: string,
        event: CalendarEventInput,
        eventId: string | null,
    ): Promise<string> {
        const response = await fetch(
            eventsUrl(calendarId, eventId ?? undefined),
            {
                method: eventId ? 'PUT' : 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    summary: event.summary,
                    location: event.location,
                    description: event.description,
                    start: { dateTime: event.start.toISOString() },
                    end: { dateTime: event.end.toISOString() },
                }),
            },
        );

        if (eventId && MISSING_STATUSES.includes(response.status)) {
            return this.upsert(accessToken, calendarId, event, null);
        }
        if (!response.ok) {
            throw new CalendarApiError(
                `Google Calendar returned ${response.status}`,
            );
        }
        return eventSchema.parse(await response.json()).id;
    }

    async remove(
        accessToken: string,
        calendarId: string,
        eventId: string,
    ): Promise<void> {
        const response = await fetch(eventsUrl(calendarId, eventId), {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok && !MISSING_STATUSES.includes(response.status)) {
            throw new CalendarApiError(
                `Google Calendar returned ${response.status}`,
            );
        }
    }
}
