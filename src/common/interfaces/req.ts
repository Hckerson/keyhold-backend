import { AuthUser } from '@core/auth/types/auth.types';

export interface RequestWithUser extends Request {
    user: AuthUser;
}
