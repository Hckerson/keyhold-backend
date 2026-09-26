import { ApiProperty } from '@nestjs/swagger';
import type { AuthResponse, AuthResponseUser } from '../types/auth.types';

export class AuthResponseUserDto implements AuthResponseUser {
    @ApiProperty()
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty({ format: 'email' })
    email: string;

    @ApiProperty()
    role: string;
}

export class AuthResponseDto implements Pick<AuthResponse, 'user'> {
    @ApiProperty({ type: AuthResponseUserDto })
    user: AuthResponseUserDto;
}
