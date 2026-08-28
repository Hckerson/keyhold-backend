import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class DbTransaction {
    constructor(private readonly prisma: PrismaService) {}

    run<T>(fn: () => Promise<T>): Promise<T> {
        return this.prisma.runTransaction(fn);
    }
}
