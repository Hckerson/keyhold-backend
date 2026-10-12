import { HttpStatus, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { Prisma } from 'generated/prisma/client';
import { AuditLogService } from '@common/services/audit-log.service';
import { RepoError } from '@common/errors/repo.error';
import { DatabaseUnavailableCode } from '@common/enums/database';
import { AllExceptionsFilter } from './all-exceptions.filter';

const PATH = '/api/users/me';

describe('AllExceptionsFilter', () => {
    let filter: AllExceptionsFilter;
    let response: { status: jest.Mock; json: jest.Mock };
    let warn: jest.SpyInstance;
    let error: jest.SpyInstance;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [
                AllExceptionsFilter,
                { provide: AuditLogService, useValue: { log: jest.fn() } },
            ],
        }).compile();

        filter = moduleRef.get(AllExceptionsFilter);
        response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        warn = jest
            .spyOn(Logger.prototype, 'warn')
            .mockImplementation(() => undefined);
        error = jest
            .spyOn(Logger.prototype, 'error')
            .mockImplementation(() => undefined);
    });

    afterEach(() => jest.restoreAllMocks());

    const handle = (exception: unknown) =>
        filter.catch(
            exception,
            new ExecutionContextHost([
                { method: 'GET', url: PATH, path: PATH, requestId: 'req_1' },
                response,
            ]),
        );

    it('answers 503 and logs one stackless warning when the database drops the connection', () => {
        handle(
            new RepoError(
                'Failed to find unique user',
                new Prisma.PrismaClientKnownRequestError(
                    'Server has closed the connection.',
                    {
                        code: DatabaseUnavailableCode.CONNECTION_CLOSED,
                        clientVersion: 'test',
                    },
                ),
            ),
        );

        expect(response.status).toHaveBeenCalledWith(
            HttpStatus.SERVICE_UNAVAILABLE,
        );
        expect(response.json).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: HttpStatus.SERVICE_UNAVAILABLE,
                path: PATH,
            }),
        );
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining(DatabaseUnavailableCode.CONNECTION_CLOSED),
        );
        expect(error).not.toHaveBeenCalled();
    });

    it('still answers 500 and logs the stack for an unexpected error', () => {
        handle(new TypeError('profile is undefined'));

        expect(response.status).toHaveBeenCalledWith(
            HttpStatus.INTERNAL_SERVER_ERROR,
        );
        expect(error).toHaveBeenCalledWith(
            expect.stringContaining(PATH),
            expect.stringContaining('TypeError'),
        );
        expect(warn).not.toHaveBeenCalled();
    });
});
