import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PropertyStatus } from '@generated/prisma/enums';
import { CreatePropertyDto } from './create-property.dto';

export class UpdatePropertyDto extends PartialType(CreatePropertyDto) {
    @ApiPropertyOptional({ enum: PropertyStatus })
    @IsEnum(PropertyStatus)
    @IsOptional()
    status?: PropertyStatus;
}
