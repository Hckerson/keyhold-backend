import { ApiProperty } from '@nestjs/swagger';
import { ConciergeStatus, ConciergeTier } from '@generated/prisma/enums';
import {
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Min,
} from 'class-validator';

export class CreateConciergeClientDto {
    @ApiProperty({ example: '9f1c2b7e-2f3a-4c55-9b6d-0f2a4b8c1d3e' })
    @IsUUID()
    clientId: string;

    @ApiProperty({ example: 50000000 })
    @IsNumber()
    @Min(0)
    budget: number;

    @ApiProperty({ example: 32000000, required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    allocated?: number;

    @ApiProperty({ example: 2016 })
    @IsInt()
    clientSince: number;

    @ApiProperty({ enum: ConciergeTier, required: false })
    @IsOptional()
    @IsEnum(ConciergeTier)
    tier?: ConciergeTier;

    @ApiProperty({ enum: ConciergeStatus, required: false })
    @IsOptional()
    @IsEnum(ConciergeStatus)
    status?: ConciergeStatus;

    @ApiProperty({ example: 'Portfolio review', required: false })
    @IsOptional()
    @IsString()
    nextAction?: string;
}
