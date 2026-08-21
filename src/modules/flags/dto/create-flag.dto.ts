import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { FlagType } from '@generated/prisma/enums';

const MIN_REASON_LENGTH = 4;

export class CreateFlagDto {
    @ApiProperty({ enum: FlagType })
    @IsEnum(FlagType)
    type: FlagType;

    @ApiProperty({ description: 'Id of the user, property or message' })
    @IsString()
    targetId: string;

    @ApiProperty()
    @IsString()
    @MinLength(MIN_REASON_LENGTH)
    reason: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    details?: string;
}
