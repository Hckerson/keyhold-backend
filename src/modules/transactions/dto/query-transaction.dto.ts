import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { TransactionStatus } from '@generated/prisma/enums';

export class QueryTransactionDto {
    @ApiPropertyOptional({ enum: TransactionStatus })
    @IsOptional()
    @IsEnum(TransactionStatus)
    status?: TransactionStatus;

    @ApiPropertyOptional({ description: 'Matches property title or address' })
    @IsOptional()
    @IsString()
    q?: string;

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
