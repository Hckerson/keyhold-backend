import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_FRONTEND_URL, DEFAULT_PORT } from '@common/enums';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { rawBody: true });

    app.setGlobalPrefix('api');

    const config = app.get(ConfigService);

    app.enableCors({
        origin: config.get<string>('FRONTEND_URL') ?? DEFAULT_FRONTEND_URL,
        credentials: true,
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
        }),
    );

    app.useGlobalInterceptors(new ResponseInterceptor());

    const swaggerConfig = new DocumentBuilder()
        .setTitle('API')
        .setDescription('Backend REST API documentation')
        .setVersion('1.0')
        .addBearerAuth()
        .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);

    const port = config.get<number>('PORT') ?? DEFAULT_PORT;
    await app.listen(port);

    const logger = new Logger('Bootstrap');
    logger.log(`API running on http://localhost:${port}/api`);
    logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap().catch((error: unknown) => {
    new Logger('Bootstrap').error(
        `Failed to bootstrap application: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
    );
    process.exit(1);
});
