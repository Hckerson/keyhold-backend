import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

const MIN_NOTES_LENGTH = 4;

export class ResolveDisputeDto {
    @ApiProperty({ description: 'Explains the outcome to both parties' })
    @IsString()
    @MinLength(MIN_NOTES_LENGTH)
    resolutionNotes: string;
}
