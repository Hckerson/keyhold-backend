import { IsArray, IsISO8601, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RescheduleViewingDto {
    @ApiProperty({ example: ['2026-09-01T15:00:00.000Z'] })
    @IsArray()
    @ArrayMinSize(1)
    @IsISO8601({}, { each: true })
    proposedTimes: string[];
}
