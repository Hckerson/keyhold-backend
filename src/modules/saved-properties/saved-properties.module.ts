import { Module } from '@nestjs/common';
import { SavedPropertiesService } from './saved-properties.service';
import { SavedPropertiesController } from './saved-properties.controller';

@Module({
    providers: [SavedPropertiesService],
    controllers: [SavedPropertiesController],
})
export class SavedPropertiesModule {}
