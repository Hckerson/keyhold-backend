import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { ServicesModule } from '@common/services/services.module';
import { UsersService } from './users.service';

@Module({
    imports: [ServicesModule],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule {}
