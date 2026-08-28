import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@generated/prisma/enums';

import {
    IsEnum,
    IsEmail,
    IsString,
    IsNotEmpty,
    IsOptional,
    Matches,
} from 'class-validator';
import { E164_MESSAGE, E164_PATTERN } from '@common/enums';

export class CreateUserDto {
    @ApiProperty({ example: 'John Doe' })
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @ApiProperty({ example: 'john@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'password123' })
    @IsString()
    @IsNotEmpty()
    password: string;

    @ApiProperty({ enum: ['ADMIN', 'BUYER', 'SELLER'], required: false })
    @IsOptional()
    @IsEnum(['ADMIN', 'BUYER', 'SELLER'])
    role?: UserRole;

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
