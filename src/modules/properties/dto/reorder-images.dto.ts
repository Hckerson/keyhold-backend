import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class ReorderImagesDto {
    @ApiProperty({
        type: [String],
        description: 'Every image id on the listing, in display order',
    })
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    ids: string[];
}
