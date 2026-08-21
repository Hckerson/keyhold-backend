import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

const MIN_REASON_LENGTH = 4;

export class RefundEscrowDto {
    @ApiProperty({ description: 'Recorded against the refund' })
    @IsString()
    @MinLength(MIN_REASON_LENGTH)
    reason: string;
}
