import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { AuditActionType } from '@generated/prisma/enums';

export class QueryAuditLogDto {
    @ApiPropertyOptional({ enum: AuditActionType })
    @IsOptional()
    @IsEnum(AuditActionType)
    action?: AuditActionType;

    @ApiPropertyOptional({ example: 'PROPERTY' })
    @IsOptional()
    @IsString()
    entityType?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    entityId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    actorId?: string;

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
