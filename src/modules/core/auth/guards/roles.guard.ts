import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { UserRole } from 'generated/prisma/enums';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );
        if (!requiredRoles) {
            return true;
        }
        const request: Request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) return false;
        return requiredRoles.some((role) => user.role === role);
    }
}
