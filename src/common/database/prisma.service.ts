import { AsyncLocalStorage } from 'async_hooks';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from 'generated/prisma/client';
import { Injectable, OnModuleInit } from '@nestjs/common';

const txStore = new AsyncLocalStorage<Prisma.TransactionClient>();

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    private readonly root: PrismaClient;

    constructor() {
        const adapter = new PrismaPg({
            connectionString: process.env.DATABASE_URL,
        });
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
