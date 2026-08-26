import { CreateUserDto } from './create-user.dto';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';

import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    avatar?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    jobTitle?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    agencyName?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    licenseNumber?: string;
}
