import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { EscrowStatus } from '@generated/prisma/enums';

export class QueryEscrowDto {
    @ApiPropertyOptional({ enum: EscrowStatus })
    @IsOptional()
    @IsEnum(EscrowStatus)
    status?: EscrowStatus;

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
