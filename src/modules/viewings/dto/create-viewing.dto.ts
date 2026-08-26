import {
    IsString,
    IsArray,
    ArrayMinSize,
    IsISO8601,
    IsOptional,
    IsEnum,
    IsInt,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ViewingMode } from '@generated/prisma/enums';

export class CreateViewingDto {
    @IsString()
    connectionId: string;

    @IsArray()
    @ArrayMinSize(1)
    @IsISO8601({}, { each: true })
    proposedTimes: string[];

    @ApiPropertyOptional({ enum: ViewingMode })
    @IsOptional()
    @IsEnum(ViewingMode)
    mode?: ViewingMode;

    @ApiPropertyOptional({ example: 30 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    durationMinutes?: number;
}
