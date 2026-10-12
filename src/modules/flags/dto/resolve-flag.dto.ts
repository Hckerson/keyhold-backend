import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ResolveFlagDto {
    @ApiPropertyOptional({
        description:
            "Reviewer note recorded beside the report, never over the reporter's details",
    })
    @IsOptional()
    @IsString()
    note?: string;
}
