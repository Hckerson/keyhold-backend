import { HttpException } from '@nestjs/common';

export class RepositoryError extends HttpException {
    constructor(message: string, cause?: unknown, errorCode: number = 500) {
        super(message, errorCode, { cause });
    }
}

export { RepositoryError as RepoError };
