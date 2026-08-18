import { IsISO8601 } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmViewingDto {
    @ApiProperty({ example: '2026-09-01T15:00:00.000Z' })
    @IsISO8601()
    confirmedTime: string;
}
