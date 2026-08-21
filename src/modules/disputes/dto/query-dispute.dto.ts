import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { DisputeStatus } from '@generated/prisma/enums';

export class QueryDisputeDto {
    @ApiPropertyOptional({ enum: DisputeStatus })
    @IsOptional()
    @IsEnum(DisputeStatus)
    status?: DisputeStatus;

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
