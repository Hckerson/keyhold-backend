import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

const MIN_REASON_LENGTH = 4;

export class RejectKycDto {
    @ApiProperty({ description: 'Shown to the applicant' })
    @IsString()
    @MinLength(MIN_REASON_LENGTH)
    rejectionReason: string;
}
