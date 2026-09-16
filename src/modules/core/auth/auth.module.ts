import { JwtModule } from '@nestjs/jwt';
import {
    JWT_ALGORITHM,
    privateKeyFrom,
    publicKeyFrom,
} from '@common/config/jwt-keys';
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '@core/users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { OAuthService } from './oauth/oauth.service';
import { OAuthController } from './oauth/oauth.controller';
import { ServicesModule } from '@common/services/services.module';
import { SettingsModule } from '@modules/settings/settings.module';
import { SuspensionsModule } from '@modules/suspensions/suspensions.module';

@Module({
    imports: [
        UsersModule,
        PassportModule,
        ServicesModule,
        SettingsModule,
        SuspensionsModule,
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                return {
                    privateKey: privateKeyFrom(config),
                    publicKey: publicKeyFrom(config),
                    signOptions: {
                        algorithm: JWT_ALGORITHM,
                        expiresIn: '7d',
                    },
                    verifyOptions: { algorithms: [JWT_ALGORITHM] },
                };
            },
        }),
    ],
    providers: [AuthService, JwtStrategy, OAuthService],
    controllers: [AuthController, OAuthController],
    exports: [AuthService],
})
export class AuthModule {}
