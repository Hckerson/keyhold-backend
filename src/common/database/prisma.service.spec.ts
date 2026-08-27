import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
    it('exposes model delegates through tx outside a transaction', () => {
        const prisma = new PrismaService();

        expect(prisma.tx.property).toBeDefined();
        expect(prisma.tx.transaction).toBeDefined();
        expect(typeof prisma.tx.property.findMany).toBe('function');
    });

    it('resolves tx to the same client the delegates live on', () => {
        const prisma = new PrismaService();

        expect(prisma.tx).toBe(prisma);
    });
});
