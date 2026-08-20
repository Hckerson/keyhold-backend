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

    @ApiProperty({ required: false })
    jobTitle?: string;

    @ApiProperty({ required: false })
    agencyName?: string;

    @ApiProperty({ required: false })
    licenseNumber?: string;

    @ApiProperty()
    emailVerified: boolean;

    @ApiProperty()
    phoneVerified: boolean;

    @ApiProperty()
    kycVerified: boolean;

    @ApiProperty({
        description: 'Completed transactions this user is party to',
    })
    transactions: number;

    @ApiProperty({ description: 'Settled value across completed transactions' })
    volume: number;

    @ApiProperty({ required: false, type: Date })
    lastActive?: Date;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
