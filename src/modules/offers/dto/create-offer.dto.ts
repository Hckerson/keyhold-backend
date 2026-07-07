import { IsString, IsNumber, IsISO8601, Min } from 'class-validator';

export class CreateOfferDto {
    @IsString()
    connectionId: string;

    @IsNumber()
    @Min(0)
    offeredPrice: number;

    @IsString()
    offeredTerms: string;

    @IsISO8601()
    expiresAt: string;
}
