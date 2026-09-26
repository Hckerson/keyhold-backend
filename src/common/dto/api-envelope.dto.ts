import { ApiProperty } from '@nestjs/swagger';

export class ApiEnvelopeDto {
    @ApiProperty()
    statusCode: number;

    @ApiProperty()
    message: string;

    @ApiProperty({ format: 'date-time' })
    timestamp: string;
}
