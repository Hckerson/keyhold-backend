import { UserRepo } from './user.repo';
import { PropertyRepo } from './property.repo';
import { ConnectionRepo } from './connection.repo';
import { MessageRepo } from './message.repo';
import { ViewingRepo } from './viewing.repo';
import { OfferRepo } from './offer.repo';
import { TransactionRepo } from './transaction.repo';
import { ReviewRepo } from './review.repo';
import { EmailVerificationRepo } from './email-verification.repo';
import { PhoneVerificationRepo } from './phone-verification.repo';
import { IdentityDocumentRepo } from './kyc-document.repo';
import { EscrowRepo } from './escrow.repo';
import { DisputeRepo } from './dispute.repo';
import { DisputeEvidenceRepo } from './dispute-evidence.repo';
import { FlagRepo } from './flag.repo';
import { UserSuspensionRepo } from './user-suspension.repo';
import { AuditLogRepo } from './audit-log.repo';
import { SavedPropertyRepo } from './saved-property.repo';
import { NotificationRepo } from './notification.repo';
import { NotificationPreferenceRepo } from './notification-preference.repo';
import { PlatformSettingRepo } from './platform-setting.repo';
import { ConciergeClientRepo } from './concierge-client.repo';
import { ConciergeServiceRepo } from './concierge-service.repo';
import { ConciergeServiceRequestRepo } from './concierge-service-request.repo';
import { ConciergePracticeRepo } from './concierge-practice.repo';
import { ConciergePracticeCoverageRepo } from './concierge-practice-coverage.repo';
import { SavedSearchRepo } from './saved-search.repo';
import { ServiceMetricRepo } from './service-metric.repo';
import { Global, Module } from '@nestjs/common';

const repos = [
    // MVP 1 repositories
    UserRepo,
    PropertyRepo,
    ConnectionRepo,
    MessageRepo,
    ViewingRepo,
    OfferRepo,
    TransactionRepo,
    ReviewRepo,
    // MVP 1.5 repositories (Phase 1)
    EmailVerificationRepo,
    PhoneVerificationRepo,
    IdentityDocumentRepo,
    EscrowRepo,
    DisputeRepo,
    DisputeEvidenceRepo,
    FlagRepo,
    UserSuspensionRepo,
    AuditLogRepo,
    // Wishlist repositories
    SavedPropertyRepo,
    NotificationRepo,
    NotificationPreferenceRepo,
    PlatformSettingRepo,
    ConciergeClientRepo,
    ConciergeServiceRepo,
    ConciergeServiceRequestRepo,
    ConciergePracticeRepo,
    ConciergePracticeCoverageRepo,
    SavedSearchRepo,
    ServiceMetricRepo,
];

@Global()
@Module({
    providers: repos,
    exports: repos,
})
export class RepoModule {}
