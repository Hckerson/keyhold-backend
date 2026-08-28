import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class CreateLeadDto {
    @ApiProperty({ description: 'One of your own listings' })
    @IsString()
    propertyId: string;

    @ApiProperty({
        description: 'Email of the registered buyer who enquired',
        example: 'buyer@example.com',
    })
    @IsEmail()
    buyerEmail: string;
}
