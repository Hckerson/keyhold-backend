import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@generated/prisma/enums';

import {
    IsEnum,
    IsEmail,
    IsString,
    IsNotEmpty,
    IsOptional,
} from 'class-validator';

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

    @ApiProperty({ example: '+1234567890', required: false })
    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @ApiProperty({ example: 'Short profile bio', required: false })
    @IsOptional()
    @IsString()
    bio?: string;
}
