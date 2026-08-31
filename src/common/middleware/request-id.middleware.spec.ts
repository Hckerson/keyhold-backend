import { NextFunction, Request, Response } from 'express';
import {
    REQUEST_ID_HEADER,
    RequestIdMiddleware,
} from './request-id.middleware';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('RequestIdMiddleware', () => {
    let middleware: RequestIdMiddleware;
    let request: Request;
    let response: Response;
    let setHeader: jest.Mock;
    let next: NextFunction;

    const run = (headers: Record<string, string> = {}) => {
        request = { headers } as Request;
        middleware.use(request, response, next);
        return request.requestId;
    };

    beforeEach(() => {
        middleware = new RequestIdMiddleware();
        setHeader = jest.fn();
        response = { setHeader } as unknown as Response;
        next = jest.fn();
    });

    it('generates an id when the caller sends none', () => {
        expect(run()).toMatch(UUID);
    });

    it('adopts the id the caller supplied', () => {
        expect(run({ [REQUEST_ID_HEADER]: 'trace-abc_123' })).toBe(
            'trace-abc_123',
        );
    });

    it('echoes the id back on the response', () => {
        const id = run();

        expect(setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, id);
    });

    it('always continues the chain', () => {
        run();

        expect(next).toHaveBeenCalledTimes(1);
    });

    it.each([
        ['an injected newline', 'abc\ndef'],
        ['a space', 'abc def'],
        ['an empty string', '   '],
        ['an over-long value', 'x'.repeat(129)],
    ])('refuses %s and generates its own', (_label, supplied) => {
        expect(run({ [REQUEST_ID_HEADER]: supplied })).toMatch(UUID);
    });
});
