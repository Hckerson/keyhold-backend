import { ApiProperty } from '@nestjs/swagger';
import { DatabaseStatus, HealthStatus } from '@common/enums/health';

export class HealthResponseDto {
    @ApiProperty({ enum: HealthStatus })
    status: HealthStatus;

    @ApiProperty({ enum: DatabaseStatus })
    database: DatabaseStatus;

    @ApiProperty()
    uptimeSeconds: number;
}
