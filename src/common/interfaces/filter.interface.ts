import { UserRole } from 'generated/prisma/enums';

interface BaseFilter {
    page?: number;
    limit?: number;
    search?: string;
}

export interface UserQueryFetchFilter extends BaseFilter {
    role?: UserRole;
}
