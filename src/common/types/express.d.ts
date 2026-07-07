import { AuthUser } from '@core/auth/types/auth.types';

declare global {
    namespace Express {
        /* eslint-disable @typescript-eslint/no-empty-object-type */
        interface User extends AuthUser {}
        /* eslint-enable @typescript-eslint/no-empty-object-type */
        interface Request {
            user?: User;
        }
    }
}
