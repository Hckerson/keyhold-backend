import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

const MIN_FIELD_LENGTH = 2;

export class SubmitKycDto {
    @ApiProperty({ example: 'PASSPORT' })
    @IsString()
    @MinLength(MIN_FIELD_LENGTH)
    documentType: string;

    @ApiProperty()
    @IsString()
    @MinLength(MIN_FIELD_LENGTH)
    documentNumber: string;

    @ApiProperty({ example: 'US' })
    @IsString()
    @MinLength(MIN_FIELD_LENGTH)
    issuerCountry: string;
}
