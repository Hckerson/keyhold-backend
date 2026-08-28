import { Module } from '@nestjs/common';
import { SuspensionsService } from './suspensions.service';
import { SuspensionsController } from './suspensions.controller';

@Module({
    providers: [SuspensionsService],
    controllers: [SuspensionsController],
    exports: [SuspensionsService],
})
export class SuspensionsModule {}
