import {
    IsEnum,
    IsEmail,
    IsString,
    IsNotEmpty,
    IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from 'generated/prisma/enums';

export class RegisterDto {
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

    @ApiProperty({
        enum: [UserRole.BUYER, UserRole.SELLER],
        description: 'User role: BUYER or SELLER',
    })
    @IsEnum(UserRole)
    role: UserRole;

    @ApiProperty({ example: '+1234567890', required: false })
    @IsOptional()
    @IsString()
    phoneNumber?: string;
}
