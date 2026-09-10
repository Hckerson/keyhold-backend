import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';
import { EMAIL_CODE_LENGTH } from '@common/enums';

const DIGITS_ONLY = /^\d+$/;

export class VerifyEmailDto {
    @ApiProperty({ example: '048213' })
    @IsString()
    @Length(EMAIL_CODE_LENGTH, EMAIL_CODE_LENGTH)
    @Matches(DIGITS_ONLY, { message: 'The code is six digits' })
    code: string;
}
