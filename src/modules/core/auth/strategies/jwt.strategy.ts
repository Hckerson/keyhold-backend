import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '@core/users/users.service';
import { SuspensionsService } from '@modules/suspensions/suspensions.service';
import type { AuthUser, JwtPayload } from '../types/auth.types';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JWT_ALGORITHM, publicKeyFrom } from '@common/config/jwt-keys';

const MS_PER_SECOND = 1000;

const issuedBefore = (
    issuedAt: number | undefined,
    validFrom?: Date | null,
) => {
    if (!validFrom) return false;
    if (issuedAt === undefined) return true;
    return issuedAt * MS_PER_SECOND < validFrom.getTime();
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        configService: ConfigService,
        private readonly usersService: UsersService,
        private readonly suspensionsService: SuspensionsService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: publicKeyFrom(configService),
            algorithms: [JWT_ALGORITHM],
        });
    }

    async validate(payload: JwtPayload): Promise<AuthUser> {
        const user = await this.usersService.findIdentity(payload.sub);
        if (!user) throw new UnauthorizedException();
        await this.suspensionsService.ensureActive(user.id, user.status);

        if (issuedBefore(payload.iat, user.tokensValidFrom)) {
            throw new UnauthorizedException('This session has been ended');
        }

        return {
            id: user.id,
            role: user.role,
            email: user.email,
            name: user.fullName,
        };
    }
}
