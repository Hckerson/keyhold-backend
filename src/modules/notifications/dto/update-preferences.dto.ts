import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, ValidateNested } from 'class-validator';
import { NotificationType } from '@generated/prisma/enums';

export class NotificationPreferenceDto {
    @ApiProperty({ enum: NotificationType })
    @IsEnum(NotificationType)
    type: NotificationType;

    @ApiProperty()
    @IsBoolean()
    enabled: boolean;

    @ApiProperty()
    @IsBoolean()
    email: boolean;

    @ApiProperty()
    @IsBoolean()
    sms: boolean;

    @ApiProperty()
    @IsBoolean()
    inApp: boolean;
}

export class UpdatePreferencesDto {
    @ApiProperty({ type: [NotificationPreferenceDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => NotificationPreferenceDto)
    preferences: NotificationPreferenceDto[];
}
