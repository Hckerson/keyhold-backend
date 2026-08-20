import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ResolveFlagDto {
    @ApiPropertyOptional({ description: 'Reviewer note recorded on the flag' })
    @IsOptional()
    @IsString()
    note?: string;
}
