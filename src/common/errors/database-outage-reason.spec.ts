import { createServer, Socket } from 'net';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma } from 'generated/prisma/client';
import { DatabaseUnavailableCode } from '@common/enums/database';
import { RepoError } from './repo.error';
import { databaseOutageReason } from './database-outage-reason';

const prismaError = (code: string) =>
    new Prisma.PrismaClientKnownRequestError('Prisma rejected the query', {
        code,
        clientVersion: 'test',
    });

const silentDatabase = async () => {
    const sockets = new Set<Socket>();
    const server = createServer((socket) => sockets.add(socket));
    await new Promise<void>((resolve) =>
        server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address();
    if (address === null || typeof address === 'string')
        throw new Error('The silent database did not bind a TCP port');
    return {
        url: `postgres://user:secret@127.0.0.1:${address.port}/app`,
        close: () => {
            sockets.forEach((socket) => socket.destroy());
            return new Promise((resolve) => server.close(resolve));
        },
    };
};

describe('database outage reason', () => {
    it.each(Object.values(DatabaseUnavailableCode))(
        'names %s when a repo call loses the database',
        (code) => {
            const error = new RepoError(
                'Failed to find unique user',
                prismaError(code),
            );

            expect(databaseOutageReason(error)).toBe(code);
        },
    );

    it('recognises the pool giving up on a server that never answers', async () => {
        const database = await silentDatabase();
        const adapter = await new PrismaPg({
            connectionString: database.url,
            connectionTimeoutMillis: 50,
        }).connect();

        const failure: unknown = await adapter
            .queryRaw({ sql: 'SELECT 1', args: [], argTypes: [] })
            .catch((error: unknown) => error);
        await adapter.dispose();
        await database.close();

        expect(databaseOutageReason(failure)).not.toBeNull();
    });

    it('leaves a duplicate-account conflict as a conflict', () => {
        const error = new RepoError(
            'An account with this email already exists',
            prismaError('P2002'),
            409,
        );

        expect(databaseOutageReason(error)).toBeNull();
    });

    it('leaves an ordinary bug as a bug', () => {
        expect(
            databaseOutageReason(new TypeError('profile is undefined')),
        ).toBeNull();
    });
});
