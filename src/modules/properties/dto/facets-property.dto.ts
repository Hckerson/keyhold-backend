import { Type } from 'class-transformer';
import {
    IsArray,
    IsEnum,
    IsOptional,
    Matches,
    ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyType } from '@generated/prisma/enums';
import {
    COUNT_TOKEN_PATTERN,
    PRICE_RANGE_PATTERN,
    QueryPropertyDto,
} from './query-property.dto';

export class FacetOptionsDto {
    @ApiPropertyOptional({ isArray: true, example: ['0-1000000', '5000000-'] })
    @IsArray()
    @Matches(PRICE_RANGE_PATTERN, { each: true })
    @IsOptional()
    price?: string[];

    @ApiPropertyOptional({ isArray: true, example: ['1', '5plus'] })
    @IsArray()
    @Matches(COUNT_TOKEN_PATTERN, { each: true })
    @IsOptional()
    beds?: string[];

    @ApiPropertyOptional({ isArray: true, example: ['1', '4plus'] })
    @IsArray()
    @Matches(COUNT_TOKEN_PATTERN, { each: true })
    @IsOptional()
    baths?: string[];

    @ApiPropertyOptional({ enum: PropertyType, isArray: true })
    @IsArray()
    @IsEnum(PropertyType, { each: true })
    @IsOptional()
    type?: PropertyType[];
}

export class FacetsPropertyDto {
    @ApiPropertyOptional({ type: QueryPropertyDto })
    @ValidateNested()
    @Type(() => QueryPropertyDto)
    @IsOptional()
    filters?: QueryPropertyDto;

    @ApiPropertyOptional({ type: FacetOptionsDto })
    @ValidateNested()
    @Type(() => FacetOptionsDto)
    @IsOptional()
    options?: FacetOptionsDto;
}
