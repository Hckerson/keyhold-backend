import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MIN_PASSWORD_LENGTH, PASSWORD_PATTERN } from '@common/enums';

export class ResetPasswordDto {
    @ApiProperty({ example: 'newpassword123' })
    @IsString()
    @MinLength(MIN_PASSWORD_LENGTH)
    @Matches(PASSWORD_PATTERN)
    password: string;

    @ApiProperty({ example: 'reset-token-abc' })
    @IsString()
    @IsNotEmpty()
    token: string;
}
