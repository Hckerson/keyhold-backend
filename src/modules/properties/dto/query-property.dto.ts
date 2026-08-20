import { Transform, Type } from 'class-transformer';
import {
    IsArray,
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Matches,
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
    POPULAR = 'popular',
}

export const COUNT_TOKEN_PATTERN = /^\d+(plus)?$/;
export const PRICE_RANGE_PATTERN = /^\d+-\d*$/;

const toArray = ({ value }: { value: unknown }) =>
    value === undefined || value === null
        ? undefined
        : Array.isArray(value)
          ? value
          : [value];

export class QueryPropertyDto {
    @ApiPropertyOptional({ enum: PropertyStatus })
    @IsEnum(PropertyStatus)
    @IsOptional()
    status?: PropertyStatus;

    @ApiPropertyOptional({ enum: PropertyType, isArray: true })
    @Transform(toArray)
    @IsArray()
    @IsEnum(PropertyType, { each: true })
    @IsOptional()
    types?: PropertyType[];

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    locality?: string;

    @ApiPropertyOptional({ description: 'Free-text search term' })
    @IsString()
    @IsOptional()
    q?: string;

    @ApiPropertyOptional({
        isArray: true,
        example: ['0-1000000', '5000000-'],
        description:
            'OR-ed price ranges as "min-max"; open upper bound as "min-"',
    })
    @Transform(toArray)
    @IsArray()
    @Matches(PRICE_RANGE_PATTERN, { each: true })
    @IsOptional()
    priceRanges?: string[];

    @ApiPropertyOptional({
        isArray: true,
        example: ['3', '5plus'],
        description: 'OR-ed bedroom counts; "Nplus" means N or more',
    })
    @Transform(toArray)
    @IsArray()
    @Matches(COUNT_TOKEN_PATTERN, { each: true })
    @IsOptional()
    beds?: string[];

    @ApiPropertyOptional({ isArray: true, example: ['2', '4plus'] })
    @Transform(toArray)
    @IsArray()
    @Matches(COUNT_TOKEN_PATTERN, { each: true })
    @IsOptional()
    baths?: string[];

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
