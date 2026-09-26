import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TimeFilter, type TimeFilterValue } from '@common/enums/filter';

export class SeriesQueryDto {
    @ApiProperty({ enum: TimeFilter })
    @IsEnum(TimeFilter)
    period: TimeFilterValue;
}
