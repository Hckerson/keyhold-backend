import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

const MIN_TITLE_LENGTH = 4;
const MIN_DESCRIPTION_LENGTH = 10;

export class CreateDisputeDto {
    @ApiProperty()
    @IsString()
    @MinLength(MIN_TITLE_LENGTH)
    title: string;

    @ApiProperty()
    @IsString()
    @MinLength(MIN_DESCRIPTION_LENGTH)
    description: string;

    @ApiPropertyOptional({ description: 'Transaction the dispute concerns' })
    @IsOptional()
    @IsString()
    transactionId?: string;
}
