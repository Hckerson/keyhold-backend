import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '@core/users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
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
                const secret = config.get<string>('JWT_SECRET');
                if (!secret) {
                    throw new Error(
                        'JWT_SECRET is not defined in environment variables',
                    );
                }
                return {
                    secret: secret,
                    signOptions: { expiresIn: '7d' },
                };
            },
        }),
    ],
    providers: [AuthService, JwtStrategy],
    controllers: [AuthController],
    exports: [AuthService],
})
export class AuthModule {}
