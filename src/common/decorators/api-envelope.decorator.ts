import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiEnvelopeDto } from '@common/dto';

interface EnvelopeOptions {
    status?: number;
    isArray?: boolean;
}

export const ApiEnvelope = (
    model: Type<unknown>,
    { status = 200, isArray = false }: EnvelopeOptions = {},
) =>
    applyDecorators(
        ApiExtraModels(ApiEnvelopeDto, model),
        ApiResponse({
            status,
            schema: {
                allOf: [
                    { $ref: getSchemaPath(ApiEnvelopeDto) },
                    {
                        type: 'object',
                        properties: {
                            data: isArray
                                ? {
                                      type: 'array',
                                      items: { $ref: getSchemaPath(model) },
                                  }
                                : { $ref: getSchemaPath(model) },
                        },
                        required: ['data'],
                    },
                ],
            },
        }),
    );
