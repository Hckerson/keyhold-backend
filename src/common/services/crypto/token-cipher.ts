import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const SEPARATOR = '.';

export class SealedTokenError extends Error {}

@Injectable()
export class TokenCipher {
    private readonly logger = new Logger(TokenCipher.name);
    private readonly key: Buffer | null;

    constructor(configService: ConfigService) {
        const encoded = configService.get<string>(
            'externalServices.calendar.tokenKey',
        );
        this.key = encoded ? Buffer.from(encoded, 'base64') : null;

        if (!this.key) {
            this.logger.warn(
                'TOKEN_ENCRYPTION_KEY not configured — calendar sync is disabled',
            );
        }
    }

    get enabled(): boolean {
        return this.key !== null;
    }

    encrypt(plain: string): string {
        const iv = randomBytes(IV_BYTES);
        const cipher = createCipheriv(ALGORITHM, this.requireKey(), iv);
        const body = Buffer.concat([
            cipher.update(plain, 'utf8'),
            cipher.final(),
        ]);

        return [iv, cipher.getAuthTag(), body]
            .map((part) => part.toString('base64url'))
            .join(SEPARATOR);
    }

    decrypt(sealed: string): string {
        const [ivPart, tagPart, bodyPart, ...rest] = sealed.split(SEPARATOR);
        if (
            ivPart === undefined ||
            tagPart === undefined ||
            bodyPart === undefined ||
            rest.length > 0
        ) {
            throw new SealedTokenError('Malformed sealed token');
        }

        const decipher = createDecipheriv(
            ALGORITHM,
            this.requireKey(),
            Buffer.from(ivPart, 'base64url'),
        );
        decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));

        return Buffer.concat([
            decipher.update(Buffer.from(bodyPart, 'base64url')),
            decipher.final(),
        ]).toString('utf8');
    }

    private requireKey(): Buffer {
        if (!this.key) {
            throw new SealedTokenError('Token encryption is not configured');
        }
        return this.key;
    }
}
