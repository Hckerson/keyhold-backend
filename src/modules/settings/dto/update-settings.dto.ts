import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
    IsArray,
    IsEnum,
    IsString,
    MinLength,
    ValidateNested,
} from 'class-validator';
import { SettingCategory } from '@generated/prisma/enums';

export class SettingEntryDto {
    @ApiProperty()
    @IsString()
    @MinLength(1)
    key: string;

    @ApiProperty()
    @IsString()
    value: string;

    @ApiProperty({ enum: SettingCategory })
    @IsEnum(SettingCategory)
    category: SettingCategory;
}

export class UpdateSettingsDto {
    @ApiProperty({ type: [SettingEntryDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SettingEntryDto)
    settings: SettingEntryDto[];
}
