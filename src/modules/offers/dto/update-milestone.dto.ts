import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsISO8601,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';
import { MilestoneStatus } from '@generated/prisma/enums';

export const MAX_MILESTONE_NOTE = 500;

export class UpdateMilestoneDto {
    @ApiPropertyOptional({ enum: MilestoneStatus })
    @IsEnum(MilestoneStatus)
    @IsOptional()
    status?: MilestoneStatus;

    @ApiPropertyOptional()
    @IsISO8601()
    @IsOptional()
    dueAt?: string;

    @ApiPropertyOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    appraisedValue?: number;

    @ApiPropertyOptional()
    @IsString()
    @MaxLength(MAX_MILESTONE_NOTE)
    @IsOptional()
    note?: string;
}
