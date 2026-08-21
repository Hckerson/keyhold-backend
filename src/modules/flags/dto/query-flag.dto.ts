import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { FlagStatus, FlagType } from '@generated/prisma/enums';

export class QueryFlagDto {
    @ApiPropertyOptional({ enum: FlagStatus })
    @IsOptional()
    @IsEnum(FlagStatus)
    status?: FlagStatus;

    @ApiPropertyOptional({ enum: FlagType })
    @IsOptional()
    @IsEnum(FlagType)
    type?: FlagType;

    @ApiPropertyOptional({ default: 1 })
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    @Min(1)
    page?: number;

    @ApiPropertyOptional({ default: 20 })
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    @Min(1)
    limit?: number;
}
