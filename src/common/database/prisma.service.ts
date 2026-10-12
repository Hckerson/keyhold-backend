import { AsyncLocalStorage } from 'async_hooks';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from 'generated/prisma/client';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { databasePool } from '@common/config/database.config';

const txStore = new AsyncLocalStorage<Prisma.TransactionClient>();

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    private static readonly logger = new Logger(PrismaService.name);
    private readonly root: PrismaClient;

    constructor() {
        const reportDroppedConnection = (error: Error) =>
            PrismaService.logger.warn(
                `Database connection dropped: ${error.message}`,
            );
        const adapter = new PrismaPg(
            { connectionString: process.env.DATABASE_URL, ...databasePool },
            {
                onPoolError: reportDroppedConnection,
                onConnectionError: reportDroppedConnection,
            },
        );
        super({ adapter });
        this.root = this;
    }

    get tx(): PrismaClient | Prisma.TransactionClient {
        return txStore.getStore() ?? this.root;
    }

    runTransaction<T>(fn: () => Promise<T>): Promise<T> {
        return this.$transaction((tx) => txStore.run(tx, fn));
    }

    async onModuleInit() {
        await this.$connect();
    }

    async ping(): Promise<boolean> {
        try {
            await this.$queryRaw`SELECT 1`;
            return true;
        } catch {
            return false;
        }
    }
}
