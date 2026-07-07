import { UserRole } from 'generated/prisma/enums';

export interface JwtPayload {
    email: string;
    sub: string;
    role: UserRole;
}

export interface AuthResponseUser {
    id: string;
    name: string; // fullName alias
    email: string;
    role: string;
}

export interface AuthResponse {
    user: AuthResponseUser;
    accessToken?: string;
}

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
}
