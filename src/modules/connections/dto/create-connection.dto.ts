import { IsString } from 'class-validator';

export class CreateConnectionDto {
    @IsString()
    propertyId: string;
}
