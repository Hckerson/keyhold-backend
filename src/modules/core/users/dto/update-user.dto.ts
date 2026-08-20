import { CreateUserDto } from './create-user.dto';
import { UserAccountStatus } from 'generated/prisma/enums';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';

import { IsOptional, IsEnum, IsString } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
    @ApiProperty({ enum: UserAccountStatus, required: false })
    @IsOptional()
    @IsEnum(UserAccountStatus)
    status?: UserAccountStatus;

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
