import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ModerationDecision {
    APPROVE = 'approve',
    CHANGES = 'changes',
    REJECT = 'reject',
}

export class ModeratePropertyDto {
    @ApiProperty({ enum: ModerationDecision })
    @IsEnum(ModerationDecision)
    decision: ModerationDecision;

    @ApiPropertyOptional({
        description: 'Required when requesting changes or rejecting',
    })
    @IsOptional()
    @IsString()
    note?: string;
}
