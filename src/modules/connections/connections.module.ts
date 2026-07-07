import { Module } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { ConnectionsController } from './connections.controller';
import { ServicesModule } from '@common/services/services.module';

@Module({
    imports: [ServicesModule],
    providers: [ConnectionsService],
    controllers: [ConnectionsController],
})
export class ConnectionsModule {}
