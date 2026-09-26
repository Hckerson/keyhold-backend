import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NEWSLETTER_TOKEN_MAX_LENGTH } from '@common/enums';

export class NewsletterTokenDto {
    @ApiProperty({ example: 'newsletter-token-abc' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(NEWSLETTER_TOKEN_MAX_LENGTH)
    token: string;
}
