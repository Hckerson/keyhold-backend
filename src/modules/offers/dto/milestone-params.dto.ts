import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { MilestoneKind } from '@generated/prisma/enums';

export class MilestoneParamsDto {
    @ApiProperty()
    @IsString()
    id: string;

    @ApiProperty({ enum: MilestoneKind })
    @IsEnum(MilestoneKind)
    kind: MilestoneKind;
}
