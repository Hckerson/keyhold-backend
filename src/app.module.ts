import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from '@core/auth/auth.module';
import { UsersModule } from '@core/users/users.module';
import { RepoModule } from '@common/repos/repo.module';
import { PrismaModule } from '@common/database/prisma.module';
import { ServicesModule } from '@common/services/services.module';
import { externalServicesConfig } from '@common/config/external-services.config';
import { AuditLogService } from '@common/services/audit-log.service';
import { AuditLogInterceptor } from '@common/interceptors/audit-log.interceptor';
import { PropertiesModule } from '@modules/properties/properties.module';
import { ConnectionsModule } from '@modules/connections/connections.module';
import { MessagesModule } from '@modules/messages/messages.module';
import { ViewingsModule } from '@modules/viewings/viewings.module';
import { OffersModule } from '@modules/offers/offers.module';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { ReviewsModule } from '@modules/reviews/reviews.module';
import { SavedPropertiesModule } from '@modules/saved-properties/saved-properties.module';
import { StatsModule } from '@modules/stats/stats.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [externalServicesConfig],
        }),
        PrismaModule,
        RepoModule,
        ServicesModule,
        AuthModule,
        UsersModule,
        PropertiesModule,
        ConnectionsModule,
        MessagesModule,
        ViewingsModule,
        OffersModule,
        TransactionsModule,
        ReviewsModule,
        SavedPropertiesModule,
        StatsModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        AuditLogService,
        {
            provide: APP_INTERCEPTOR,
            useClass: AuditLogInterceptor,
        },
    ],
})
export class AppModule {}
