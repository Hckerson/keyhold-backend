import { writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { GLOBAL_PREFIX } from '@common/enums';
import { swaggerConfig } from './openapi';

const OUTPUT_PATH = 'openapi.json';

const PREVIEW_PLACEHOLDER = 'contract-preview';

const SECRETS_UNUSED_IN_PREVIEW = [
    'DATABASE_URL',
    'JWT_PRIVATE_KEY',
    'JWT_PUBLIC_KEY',
];

const standInForSecretsPreviewNeverReads = () => {
    for (const key of SECRETS_UNUSED_IN_PREVIEW) {
        process.env[key] ??= PREVIEW_PLACEHOLDER;
    }
};

async function emit() {
    standInForSecretsPreviewNeverReads();

    const { AppModule } = await import('./app.module.js');

    const app = await NestFactory.create(AppModule, {
        preview: true,
        logger: false,
    });

    app.setGlobalPrefix(GLOBAL_PREFIX);

    const document = SwaggerModule.createDocument(app, swaggerConfig);

    writeFileSync(OUTPUT_PATH, `${JSON.stringify(document, null, 4)}\n`);
    await app.close();

    process.stdout.write(
        `${OUTPUT_PATH}: ${Object.keys(document.paths).length} paths, ${Object.keys(document.components?.schemas ?? {}).length} schemas\n`,
    );
}

void emit();
