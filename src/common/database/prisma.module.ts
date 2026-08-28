import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DbTransaction } from './db-transaction';

@Global()
@Module({
    providers: [PrismaService, DbTransaction],
    exports: [PrismaService, DbTransaction],
})
export class PrismaModule {}
