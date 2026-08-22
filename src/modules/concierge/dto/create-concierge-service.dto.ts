import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsNotEmpty, Min } from 'class-validator';

export class CreateConciergeServiceDto {
    @ApiProperty({ example: 'relocation' })
    @IsString()
    @IsNotEmpty()
    key: string;

    @ApiProperty({ example: 'International Relocation' })
    @IsString()
    @IsNotEmpty()
    label: string;

    @ApiProperty({ example: 6 })
    @IsInt()
    @Min(0)
    capacity: number;
}
