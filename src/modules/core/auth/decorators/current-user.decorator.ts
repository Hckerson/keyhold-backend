import { AuthUser } from '../types/auth.types';
import { RequestWithUser } from '@common/interfaces/req';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
        const request: RequestWithUser = ctx.switchToHttp().getRequest();
        return request.user;
    },
);
