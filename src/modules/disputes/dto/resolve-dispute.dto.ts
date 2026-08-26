import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { DisputeOutcome } from '@common/enums';

const MIN_NOTES_LENGTH = 4;

export class ResolveDisputeDto {
    @ApiProperty({ description: 'Explains the outcome to both parties' })
    @IsString()
    @MinLength(MIN_NOTES_LENGTH)
    resolutionNotes: string;

    @ApiPropertyOptional({ enum: DisputeOutcome })
    @IsOptional()
    @IsEnum(DisputeOutcome)
    outcome?: DisputeOutcome;
}
