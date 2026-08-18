import { Type } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyStatus, PropertyType } from '@generated/prisma/enums';

export enum PropertySort {
    NEWEST = 'newest',
    PRICE_ASC = 'price-asc',
    PRICE_DESC = 'price-desc',
    BEDROOMS_DESC = 'bedrooms-desc',
    SQFT_DESC = 'sqft-desc',
}

export class QueryPropertyDto {
    @ApiPropertyOptional({ enum: PropertyStatus })
    @IsEnum(PropertyStatus)
    @IsOptional()
    status?: PropertyStatus;

    @ApiPropertyOptional({ enum: PropertyType })
    @IsEnum(PropertyType)
    @IsOptional()
    type?: PropertyType;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    locality?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    q?: string;

    @ApiPropertyOptional()
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    @Min(0)
    minPrice?: number;

    @ApiPropertyOptional()
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    @Min(0)
    maxPrice?: number;

    @ApiPropertyOptional()
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    @Min(0)
    bedrooms?: number;

    @ApiPropertyOptional()
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    @Min(0)
    bathrooms?: number;

    @ApiPropertyOptional()
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    @Min(0)
    minSqFt?: number;

    @ApiPropertyOptional({ enum: PropertySort })
    @IsEnum(PropertySort)
    @IsOptional()
    sort?: PropertySort;

    @ApiPropertyOptional({ default: 1 })
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    @Min(1)
    page?: number;

    @ApiPropertyOptional({ default: 20 })
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    @Min(1)
    limit?: number;
}
