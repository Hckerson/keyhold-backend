import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
    .setTitle('API')
    .setDescription('Backend REST API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
