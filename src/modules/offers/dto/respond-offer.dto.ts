import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { OfferStatus } from '@generated/prisma/enums';
import { OFFER_RESPONSE_STATUSES } from '@common/enums';

export class RespondOfferDto {
    @IsIn(OFFER_RESPONSE_STATUSES)
    status: OfferStatus;

    @IsNumber()
    @IsOptional()
    @Min(0)
    responsePrice?: number;

    @IsString()
    @IsOptional()
    responseFeedback?: string;
}
