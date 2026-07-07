import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
    @ApiProperty({ example: 'newpassword123' })
    @IsString()
    @IsNotEmpty()
    password: string;

    @ApiProperty({ example: 'reset-token-abc' })
    @IsString()
    @IsNotEmpty()
    token: string;
}
