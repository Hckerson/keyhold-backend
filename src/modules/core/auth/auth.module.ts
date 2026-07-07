import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '@core/users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaService } from '@common/database/prisma.service';

@Module({
    imports: [
        UsersModule,
        PassportModule,
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
    providers: [AuthService, JwtStrategy, PrismaService],
    controllers: [AuthController],
    exports: [AuthService],
})
export class AuthModule {}
