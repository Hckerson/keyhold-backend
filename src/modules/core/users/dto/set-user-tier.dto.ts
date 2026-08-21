import { ApiProperty } from '@nestjs/swagger';
import { UserTier } from '@generated/prisma/enums';
import { IsEnum } from 'class-validator';

export class SetUserTierDto {
    @ApiProperty({ enum: UserTier })
    @IsEnum(UserTier)
    tier: UserTier;
}
