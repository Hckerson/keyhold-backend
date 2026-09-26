export const THROTTLE_WINDOW_MS = 60_000;

export const THROTTLE_LIMIT = 120;

export const AUTH_THROTTLE_LIMIT = 5;

export const authThrottle = {
    default: { ttl: THROTTLE_WINDOW_MS, limit: AUTH_THROTTLE_LIMIT },
};

export const NEWSLETTER_THROTTLE_LIMIT = 3;

export const newsletterThrottle = {
    default: { ttl: THROTTLE_WINDOW_MS, limit: NEWSLETTER_THROTTLE_LIMIT },
};
