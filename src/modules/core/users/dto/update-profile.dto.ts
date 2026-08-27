import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';
import { E164_MESSAGE, E164_PATTERN } from '@common/enums';

export class UpdateProfileDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    fullName?: string;

    @ApiProperty({ example: '+14155552671', required: false })
    @IsOptional()
    @IsString()
    @Matches(E164_PATTERN, { message: E164_MESSAGE })
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
