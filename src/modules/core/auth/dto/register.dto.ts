import {
    IsIn,
    IsEmail,
    IsString,
    IsNotEmpty,
    IsOptional,
    MinLength,
    Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from 'generated/prisma/enums';
import {
    E164_MESSAGE,
    E164_PATTERN,
    MIN_PASSWORD_LENGTH,
    PASSWORD_PATTERN,
    PUBLIC_REGISTER_ROLES,
} from '@common/enums';

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
    @MinLength(MIN_PASSWORD_LENGTH)
    @Matches(PASSWORD_PATTERN)
    password: string;

    @ApiProperty({
        enum: PUBLIC_REGISTER_ROLES,
        description: 'User role: BUYER or SELLER',
    })
    @IsIn(PUBLIC_REGISTER_ROLES)
    role: UserRole;

    @ApiProperty({ example: '+14155552671', required: false })
    @IsOptional()
    @IsString()
    @Matches(E164_PATTERN, { message: E164_MESSAGE })
    phoneNumber?: string;
}
