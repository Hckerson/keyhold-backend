import { ApiProperty } from '@nestjs/swagger';
import { PropertyType } from '@generated/prisma/enums';
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class CreateSavedSearchDto {
    @ApiProperty({ example: 'Beverly Hills estates' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'Beverly Hills', required: false })
    @IsOptional()
    @IsString()
    locality?: string;

    @ApiProperty({ example: 5000000, required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    minPrice?: number;

    @ApiProperty({ example: 20000000, required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    maxPrice?: number;

    @ApiProperty({ example: 4, required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    minBedrooms?: number;

    @ApiProperty({ example: 3, required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    minBathrooms?: number;

    @ApiProperty({ example: 4000, required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    minSqFt?: number;

    @ApiProperty({ enum: PropertyType, required: false })
    @IsOptional()
    @IsEnum(PropertyType)
    propertyType?: PropertyType;

    @ApiProperty({ example: true, required: false })
    @IsOptional()
    @IsBoolean()
    notify?: boolean;
}
