import { Module } from '@nestjs/common';
import { ServicesModule } from '@common/services/services.module';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { GoogleCalendarApi } from './google-calendar.api';

@Module({
    imports: [ServicesModule],
    providers: [CalendarService, GoogleCalendarApi],
    controllers: [CalendarController],
    exports: [CalendarService],
})
export class CalendarModule {}
