import {
    CallHandler,
    ConflictException,
    ExecutionContext,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { lastValueFrom, of } from 'rxjs';
import { IdempotencyRecordRepo } from '@common/repos/idempotency-record.repo';
import { IdempotencyInterceptor } from './idempotency.interceptor';

const KEY = 'key_1';
const USER = 'usr_buyer';
const PATH = '/api/offers';

const contextFor = (
    headers: Record<string, string>,
    method = 'POST',
    userId: string | undefined = USER,
): ExecutionContext => {
    const request = { headers, method, path: PATH, user: { id: userId } };
    return new ExecutionContextHost([request]);
};

describe('IdempotencyInterceptor', () => {
    let records: { findUnique: jest.Mock; create: jest.Mock };
    let interceptor: IdempotencyInterceptor;
    let handle: jest.Mock;
    let handler: CallHandler;

    const handled = { id: 'off_1' };

    beforeEach(async () => {
        records = {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(undefined),
        };
        handle = jest.fn().mockReturnValue(of(handled));
        handler = { handle };
        const moduleRef = await Test.createTestingModule({
            providers: [
                IdempotencyInterceptor,
                { provide: IdempotencyRecordRepo, useValue: records },
            ],
        }).compile();

        interceptor = moduleRef.get(IdempotencyInterceptor);
    });

    const run = (context: ExecutionContext) =>
        lastValueFrom(interceptor.intercept(context, handler));

    it('passes a request with no idempotency key straight through', async () => {
        await expect(run(contextFor({}))).resolves.toEqual(handled);
        expect(records.findUnique).not.toHaveBeenCalled();
        expect(records.create).not.toHaveBeenCalled();
    });

    it('passes a GET straight through even when a key is present', async () => {
        await expect(
            run(contextFor({ 'idempotency-key': KEY }, 'GET')),
        ).resolves.toEqual(handled);
        expect(records.findUnique).not.toHaveBeenCalled();
    });

    it('stores the response the first time a key is seen', async () => {
        await expect(
            run(contextFor({ 'idempotency-key': KEY })),
        ).resolves.toEqual(handled);

        expect(handle).toHaveBeenCalledTimes(1);
        expect(records.create).toHaveBeenCalledWith({
            data: {
                key: KEY,
                userId: USER,
                method: 'POST',
                path: PATH,
                response: JSON.stringify(handled),
            },
        });
    });

    it('replays the stored response without running the handler again', async () => {
        records.findUnique.mockResolvedValue({
            key: KEY,
            userId: USER,
            method: 'POST',
            path: PATH,
            response: JSON.stringify(handled),
        });

        await expect(
            run(contextFor({ 'idempotency-key': KEY })),
        ).resolves.toEqual(handled);

        expect(handle).not.toHaveBeenCalled();
        expect(records.create).not.toHaveBeenCalled();
    });

    it('refuses a key replayed against a different path', async () => {
        records.findUnique.mockResolvedValue({
            key: KEY,
            userId: USER,
            method: 'POST',
            path: '/api/viewings',
            response: JSON.stringify(handled),
        });

        await expect(
            run(contextFor({ 'idempotency-key': KEY })),
        ).rejects.toThrow(ConflictException);
        expect(handle).not.toHaveBeenCalled();
    });

    it('refuses a key replayed by a different user', async () => {
        records.findUnique.mockResolvedValue({
            key: KEY,
            userId: 'usr_other',
            method: 'POST',
            path: PATH,
            response: JSON.stringify(handled),
        });

        await expect(
            run(contextFor({ 'idempotency-key': KEY })),
        ).rejects.toThrow(ConflictException);
    });
});
