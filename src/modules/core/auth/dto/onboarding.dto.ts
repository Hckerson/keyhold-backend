import { IsString, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { E164_MESSAGE, E164_PATTERN } from '@common/enums';

export class OnboardingDto {
    @ApiProperty({ example: '+14155552671', required: false })
    @IsOptional()
    @IsString()
    @Matches(E164_PATTERN, { message: E164_MESSAGE })
    phoneNumber?: string;

    @ApiProperty({ example: 'Short profile bio', required: false })
    @IsOptional()
    @IsString()
    bio?: string;
}
