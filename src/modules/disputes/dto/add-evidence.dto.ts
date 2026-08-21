import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DisputeEvidenceType } from '@generated/prisma/enums';

export class AddEvidenceDto {
    @ApiProperty({ enum: DisputeEvidenceType })
    @IsEnum(DisputeEvidenceType)
    type: DisputeEvidenceType;

    @ApiProperty({ description: 'URL or text content' })
    @IsString()
    content: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    label?: string;
}
