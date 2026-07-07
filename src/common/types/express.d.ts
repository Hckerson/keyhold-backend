import { AuthUser } from '@core/auth/types/auth.types';

declare global {
    namespace Express {
        interface User extends AuthUser {}
        interface Request {
            user?: User;
        }
    }
}
