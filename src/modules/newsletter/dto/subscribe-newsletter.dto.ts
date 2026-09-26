import {
    Equals,
    IsEmail,
    IsIn,
    IsNotEmpty,
    IsString,
    MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
    EMAIL_MAX_LENGTH,
    NEWSLETTER_CONSENT_MAX_LENGTH,
    NEWSLETTER_SOURCES,
} from '@common/enums';

const normalizeEmail = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value;

const trim = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value;

export class SubscribeNewsletterDto {
    @ApiProperty({ example: 'reader@example.com' })
    @Transform(normalizeEmail)
    @IsEmail()
    @MaxLength(EMAIL_MAX_LENGTH)
    email: string;

    @ApiProperty({ example: true })
    @Equals(true)
    consent: true;

    @ApiProperty({
        example: 'Occasional off-market notes. Unsubscribe any time.',
    })
    @Transform(trim)
    @IsString()
    @IsNotEmpty()
    @MaxLength(NEWSLETTER_CONSENT_MAX_LENGTH)
    consentText: string;

    @ApiProperty({ enum: NEWSLETTER_SOURCES })
    @IsIn(NEWSLETTER_SOURCES)
    source: (typeof NEWSLETTER_SOURCES)[number];
}
