import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value;

export class SendLeadEmailDto {
    @Transform(trim)
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    subject: string;

    @Transform(trim)
    @IsString()
    @IsNotEmpty()
    @MaxLength(5000)
    body: string;
}
