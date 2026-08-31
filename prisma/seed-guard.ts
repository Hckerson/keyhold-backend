const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '0.0.0.0'];

const ACK = 'SEED_REMOTE_DATABASE';

export const assertSeedTarget = (raw: string | undefined): string => {
    if (!raw) {
        throw new Error(
            'DATABASE_URL is not set. The seed refuses to guess a target.',
        );
    }

    const { hostname } = new URL(raw);

    if (LOCAL_HOSTS.includes(hostname)) return hostname;

    if (process.env['SEED_ACK'] === ACK) return hostname;

    throw new Error(
        [
            `Refusing to seed ${hostname} — it is not a local database.`,
            'Seed data is for development. Start a local one with "pnpm db:dev"',
            `or, if you really mean to seed a remote database, set SEED_ACK=${ACK}.`,
        ].join('\n'),
    );
};
