import { ApiProperty } from '@nestjs/swagger';
import { TimeFilter, type TimeFilterValue } from '@common/enums/filter';

export class PeriodBoundsDto {
    @ApiProperty({ enum: TimeFilter })
    period: TimeFilterValue;

    @ApiProperty({ format: 'date-time' })
    start: string;

    @ApiProperty({ format: 'date-time' })
    end: string;
}

export class PeriodTotalResponseDto extends PeriodBoundsDto {
    @ApiProperty()
    total: number;
}

export class SeriesPointDto {
    @ApiProperty({ example: '2026-09' })
    key: string;

    @ApiProperty()
    value: number;
}

export class PeriodSeriesResponseDto extends PeriodBoundsDto {
    @ApiProperty({ type: [SeriesPointDto] })
    points: SeriesPointDto[];
}
