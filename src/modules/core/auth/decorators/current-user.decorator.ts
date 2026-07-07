import { Request } from 'express';
import { AuthUser } from '../types/auth.types';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
        const request: Request = ctx.switchToHttp().getRequest();
        return request.user;
    },
);
