import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateConciergePracticeDto {
    @ApiProperty({ example: 'check-in' })
    @IsString()
    @IsNotEmpty()
    key: string;

    @ApiProperty({ example: 'Monthly portfolio check-in' })
    @IsString()
    @IsNotEmpty()
    label: string;

    @ApiProperty({ example: 'Monthly' })
    @IsString()
    @IsNotEmpty()
    cadence: string;
}
