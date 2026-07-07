import { UserRole } from '../../../../../generated/prisma';

export interface AuthUser {
    sub: string;
    email: string;
    fullName: string;
    role: UserRole;
    iat?: number;
    exp?: number;
}
