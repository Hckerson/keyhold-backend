import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsEnum,
    IsISO8601,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';
import { Contingency } from '@generated/prisma/enums';

export class CreateOfferDto {
    @IsString()
    connectionId: string;

    @IsNumber()
    @Min(0)
    offeredPrice: number;

    @IsString()
    offeredTerms: string;

    @IsISO8601()
    expiresAt: string;

    @ApiPropertyOptional()
    @IsISO8601()
    @IsOptional()
    moveInDate?: string;

    @ApiPropertyOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    earnestMoney?: number;

    @ApiPropertyOptional({ enum: Contingency, isArray: true })
    @IsArray()
    @IsEnum(Contingency, { each: true })
    @IsOptional()
    contingencies?: Contingency[];
}
