import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { NotificationType } from '@generated/prisma/enums';

export class QueryNotificationDto {
    @ApiPropertyOptional({ enum: NotificationType })
    @IsOptional()
    @IsEnum(NotificationType)
    type?: NotificationType;

    @ApiPropertyOptional()
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    isRead?: boolean;

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
