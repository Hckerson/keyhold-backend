import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from '@core/auth/auth.module';
import { UsersModule } from '@core/users/users.module';
import { RepoModule } from '@common/repos/repo.module';
import { PrismaModule } from '@common/database/prisma.module';
import { ServicesModule } from '@common/services/services.module';
import { externalServicesConfig } from '@common/config/external-services.config';
import { validateEnv } from '@common/config/env.validation';
import { AuditLogService } from '@common/services/audit-log.service';
import { AuditLogInterceptor } from '@common/interceptors/audit-log.interceptor';
import { PropertiesModule } from '@modules/properties/properties.module';
import { ConnectionsModule } from '@modules/connections/connections.module';
import { MessagesModule } from '@modules/messages/messages.module';
import { ContactModule } from '@modules/contact/contact.module';
import { ViewingsModule } from '@modules/viewings/viewings.module';
import { OffersModule } from '@modules/offers/offers.module';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { ReviewsModule } from '@modules/reviews/reviews.module';
import { SavedPropertiesModule } from '@modules/saved-properties/saved-properties.module';
import { StatsModule } from '@modules/stats/stats.module';
import { FlagsModule } from '@modules/flags/flags.module';
import { KycModule } from '@modules/kyc/kyc.module';
import { SuspensionsModule } from '@modules/suspensions/suspensions.module';
import { EscrowModule } from '@modules/escrow/escrow.module';
import { DisputesModule } from '@modules/disputes/disputes.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { SettingsModule } from '@modules/settings/settings.module';
import { ConciergeModule } from '@modules/concierge/concierge.module';
import { SavedSearchesModule } from '@modules/saved-searches/saved-searches.module';
import { ServiceHealthModule } from '@modules/service-health/service-health.module';
import { HealthModule } from '@modules/health/health.module';
import { AllExceptionsFilter } from '@common/filters/all-exceptions.filter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import {
    THROTTLE_LIMIT,
    THROTTLE_WINDOW_MS,
} from '@common/config/throttle.config';
import { RequestIdMiddleware } from '@common/middleware/request-id.middleware';
import { IdempotencyInterceptor } from '@common/interceptors/idempotency.interceptor';
import { ServiceMetricInterceptor } from '@common/interceptors/service-metric.interceptor';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [externalServicesConfig],
            validate: validateEnv,
        }),
        ThrottlerModule.forRoot([
            { ttl: THROTTLE_WINDOW_MS, limit: THROTTLE_LIMIT },
        ]),
        PrismaModule,
        RepoModule,
        ServicesModule,
        AuthModule,
        UsersModule,
        PropertiesModule,
        ConnectionsModule,
        MessagesModule,
        ContactModule,
        ViewingsModule,
        OffersModule,
        TransactionsModule,
        ReviewsModule,
        SavedPropertiesModule,
        StatsModule,
        FlagsModule,
        KycModule,
        SuspensionsModule,
        EscrowModule,
        DisputesModule,
        AuditLogsModule,
        NotificationsModule,
        SettingsModule,
        ConciergeModule,
        SavedSearchesModule,
        ServiceHealthModule,
        HealthModule,
    ],
    controllers: [AppController],
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
        {
            provide: APP_FILTER,
            useClass: AllExceptionsFilter,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: IdempotencyInterceptor,
        },
        AppService,
        AuditLogService,
        {
            provide: APP_INTERCEPTOR,
            useClass: AuditLogInterceptor,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: ServiceMetricInterceptor,
        },
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(RequestIdMiddleware).forRoutes('{*path}');
    }
}
