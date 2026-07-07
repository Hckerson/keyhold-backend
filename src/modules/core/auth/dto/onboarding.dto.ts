import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OnboardingDto {
    @ApiProperty({ example: '+1234567890', required: false })
    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @ApiProperty({ example: 'Short profile bio', required: false })
    @IsOptional()
    @IsString()
    bio?: string;
}
