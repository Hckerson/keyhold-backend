import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
    handleRequest<TUser>(
        error: unknown,
        user: TUser | false,
    ): TUser | undefined {
        return error || !user ? undefined : user;
    }
}
