import { CreateUserDto } from './create-user.dto';
import { UserAccountStatus } from 'generated/prisma/enums';
import { ApiProperty, PartialType } from '@nestjs/swagger';

import { IsOptional, IsEnum } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
    @ApiProperty({ enum: UserAccountStatus, required: false })
    @IsOptional()
    @IsEnum(UserAccountStatus)
    status?: UserAccountStatus;
}
