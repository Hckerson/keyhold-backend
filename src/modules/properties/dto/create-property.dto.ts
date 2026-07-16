import {
    IsString,
    IsNumber,
    IsInt,
    IsOptional,
    IsArray,
    Min,
    IsEnum,
} from 'class-validator';
import { PropertyType } from '@generated/prisma/enums';

export class CreatePropertyDto {
    @IsString()
    title: string;

    @IsString()
    description: string;

    @IsString()
    address: string;

    @IsNumber()
    @Min(0)
    price: number;

    @IsInt()
    @Min(1)
    bedrooms: number;

    @IsInt()
    @Min(1)
    bathrooms: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    sqFt?: number;

    @IsEnum(PropertyType)
    type: PropertyType;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    amenities?: string[];

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    features?: string[];
}
