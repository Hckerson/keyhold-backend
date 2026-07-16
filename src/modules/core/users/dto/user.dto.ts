import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserAccountStatus } from '@generated/prisma/enums';

export class UserDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    fullName: string;

    @ApiProperty()
    email: string;

    @ApiProperty()
    phoneNumber?: string;

    @ApiProperty()
    bio?: string;

    @ApiProperty()
    avatar?: string;

    @ApiProperty()
    role: UserRole;

    @ApiProperty()
    status: UserAccountStatus;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
