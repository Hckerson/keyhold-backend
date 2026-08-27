import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export const MIN_PROMOTION_DAYS = 1;
export const MAX_PROMOTION_DAYS = 90;

export class PromotePropertyDto {
    @ApiProperty({
        description: 'How many days the listing stays featured',
        minimum: MIN_PROMOTION_DAYS,
        maximum: MAX_PROMOTION_DAYS,
        example: 14,
    })
    @Type(() => Number)
    @IsInt()
    @Min(MIN_PROMOTION_DAYS)
    @Max(MAX_PROMOTION_DAYS)
    days: number;
}
