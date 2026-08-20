import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

const MIN_REASON_LENGTH = 4;

export class CreateSuspensionDto {
    @ApiProperty()
    @IsString()
    userId: string;

    @ApiProperty({ description: 'Recorded against the account' })
    @IsString()
    @MinLength(MIN_REASON_LENGTH)
    reason: string;

    @ApiPropertyOptional({ description: 'Days; omit for indefinite' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    duration?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;
}
