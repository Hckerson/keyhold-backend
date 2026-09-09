import * as Sentry from '@sentry/nestjs';
import { DEFAULT_SENTRY_TRACES_SAMPLE_RATE } from '@common/enums';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
    Sentry.init({
        dsn,
        environment: process.env.NODE_ENV,
        tracesSampleRate: Number(
            process.env.SENTRY_TRACES_SAMPLE_RATE ??
                DEFAULT_SENTRY_TRACES_SAMPLE_RATE,
        ),
        sendDefaultPii: false,
    });
}
