import { IsISO8601, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SeriesQueryDto } from './series-query.dto';

export class TotalQueryDto extends SeriesQueryDto {
    @ApiProperty({
        required: false,
        example: '2026-09-22',
        description: 'Any instant inside the period. Defaults to now.',
    })
    @IsOptional()
    @IsISO8601({ strict: true })
    date?: string;
}
