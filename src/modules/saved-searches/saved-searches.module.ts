import { Module } from '@nestjs/common';
import { SavedSearchesService } from './saved-searches.service';
import { SavedSearchesController } from './saved-searches.controller';

@Module({
    providers: [SavedSearchesService],
    controllers: [SavedSearchesController],
    exports: [SavedSearchesService],
})
export class SavedSearchesModule {}
