import { IsString, IsNumber, Min } from 'class-validator';

export class CreateTransactionDto {
    @IsString()
    offerId: string;

    @IsNumber()
    @Min(0)
    finalPrice: number;

    @IsString()
    terms: string;
}
