import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '@core/users/users.service';
import { SuspensionsService } from '@modules/suspensions/suspensions.service';
import type { AuthUser, JwtPayload } from '../types/auth.types';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
        private readonly suspensionsService: SuspensionsService,
    ) {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
            throw new Error(
                'JWT_SECRET is not defined in environment variables',
            );
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
    }

    async validate(payload: JwtPayload): Promise<AuthUser> {
        const user = await this.usersService.findIdentity(payload.sub);
        if (!user) throw new UnauthorizedException();
        await this.suspensionsService.ensureActive(user.id, user.status);
        return {
            id: user.id,
            role: user.role,
            email: user.email,
            name: user.fullName,
        };
    }
}
