import {
    IsString,
    IsNumber,
    IsInt,
    IsOptional,
    IsArray,
    Min,
    Max,
    IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyType } from '@generated/prisma/enums';

export class CreatePropertyDto {
    @ApiProperty({ example: 'Cliffside Estate at Marin Ridge' })
    @IsString()
    title: string;

    @ApiProperty()
    @IsString()
    description: string;

    @ApiProperty({ example: '184 Ridgecrest Terrace' })
    @IsString()
    address: string;

    @ApiProperty({ example: 'Marin Ridge' })
    @IsString()
    locality: string;

    @ApiProperty({ example: 'CA' })
    @IsString()
    region: string;

    @ApiProperty({ example: '94904' })
    @IsString()
    postalCode: string;

    @ApiPropertyOptional({ example: 'US' })
    @IsString()
    @IsOptional()
    country?: string;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    @Min(-90)
    @Max(90)
    latitude?: number;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    @Min(-180)
    @Max(180)
    longitude?: number;

    @ApiProperty({ example: 4850000 })
    @IsNumber()
    @Min(0)
    price: number;

    @ApiProperty({ example: 5 })
    @IsInt()
    @Min(0)
    bedrooms: number;

    @ApiProperty({ example: 4 })
    @IsInt()
    @Min(0)
    bathrooms: number;

    @ApiPropertyOptional({ example: 6200 })
    @IsNumber()
    @IsOptional()
    @Min(0)
    sqFt?: number;

    @ApiPropertyOptional({ example: 43560 })
    @IsNumber()
    @IsOptional()
    @Min(0)
    lotSqFt?: number;

    @ApiPropertyOptional({ example: 2018 })
    @IsInt()
    @IsOptional()
    @Min(1600)
    yearBuilt?: number;

    @ApiPropertyOptional({ example: 72 })
    @IsInt()
    @IsOptional()
    @Min(0)
    @Max(100)
    walkScore?: number;

    @ApiProperty({ enum: PropertyType })
    @IsEnum(PropertyType)
    type: PropertyType;

    @ApiPropertyOptional({ type: [String] })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    amenities?: string[];

    @ApiPropertyOptional({ type: [String] })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    features?: string[];
}
