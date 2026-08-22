import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateConciergeClientDto } from './create-concierge-client.dto';

export class UpdateConciergeClientDto extends PartialType(
    OmitType(CreateConciergeClientDto, ['clientId'] as const),
) {}
