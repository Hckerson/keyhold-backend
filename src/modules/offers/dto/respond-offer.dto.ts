import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { OfferStatus } from '../../../../generated/prisma';

export class RespondOfferDto {
    @IsEnum(OfferStatus)
    status: OfferStatus;

    @IsNumber()
    @IsOptional()
    @Min(0)
    responsePrice?: number;

    @IsString()
    @IsOptional()
    responseFeedback?: string;
}
