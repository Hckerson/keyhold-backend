import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    fullName?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    bio?: string;

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
