import { IsString } from 'class-validator';

export class CreateMessageDto {
    @IsString()
    connectionId: string;

    @IsString()
    content: string;
}
