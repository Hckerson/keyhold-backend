import { IsString, IsArray, IsISO8601 } from 'class-validator';

export class CreateViewingDto {
    @IsString()
    connectionId: string;

    @IsArray()
    @IsISO8601({}, { each: true })
    proposedTimes: string[];
}
