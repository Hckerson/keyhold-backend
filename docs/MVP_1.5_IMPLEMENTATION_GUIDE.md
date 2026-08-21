# MVP 1.5 - Complete Implementation Guide

**Status:** ✅ All 5 domains fully designed by specialized agents  
**Total Endpoints:** ~65  
**Total Models:** 8 new  
**Timeline:** 6 weeks with 2-3 engineers  
**Complexity:** Medium-High

---

## 📂 What You Have

**File:** `MVP_1.5_COMPLETE_DESIGN_SPECS.json` (in `backend/docs/`)

This contains complete specs for:

1. ✅ **User Verification & Email Confirmation**
    - Prisma schema (EmailVerification, PhoneVerification, KycDocument models)
    - 12 API endpoints (send verification, verify email, verify phone, verify KYC, status checks)
    - Service layer (token generation, verification logic, rate limiting)
    - DTOs with class-validator decorators
    - Repository queries
    - Controller endpoints with guards

2. ✅ **Escrow & Payment Hold System**
    - Prisma schema (Escrow model, status enums)
    - 9 API endpoints (create hold, release, return, dispute freeze, admin override)
    - Stripe Connect integration
    - Webhook handling for payment release
    - Service layer (hold logic, release conditions, dispute handling)
    - Integration with Transaction model

3. ✅ **Dispute Resolution System**
    - Prisma schema (Dispute, DisputeEvidence models)
    - 12 API endpoints (create dispute, submit evidence, view, respond, admin mediate, resolve)
    - State machine (OPEN → REVIEW → MEDIATION → RESOLVED → CLOSED)
    - Service layer (evidence validation, mediation workflow, auto-resolution)
    - Notification triggers on every status change

4. ✅ **Admin Moderation & Content Control**
    - Prisma schema (Flag, UserSuspension models)
    - 18 API endpoints (flag resources, resolve flags, suspend users, view queue)
    - Service layer (auto-suspend logic at 5+ flags, dispute integration)
    - Repository queries for moderation queue
    - Admin dashboard endpoints

5. ✅ **Transaction Audit Trail & Logging**
    - Prisma schema (AuditLog model)
    - Middleware to auto-log all state changes
    - 6 API endpoints (get audit log, export report, view by resource/user)
    - Immutable log design (no deletion)
    - Before/after value tracking

**Plus:** Unified synthesis with complete Prisma schema, dependency order, file structure, integration checklist

---

## 🚀 Quick Start

### Phase 1: Foundation (Week 1)

**Create these files:**

```
src/
├── common/
│   ├── enums/
│   │   ├── verification.enum.ts (EmailVerificationStatus, PhoneVerificationStatus, KycDocumentType, etc.)
│   │   ├── escrow.enum.ts (EscrowStatus)
│   │   ├── dispute.enum.ts (DisputeStatus, DisputeReason)
│   │   └── moderation.enum.ts (FlagReason, FlagStatus, SuspensionReason)
│   ├── repos/
│   │   ├── verification.repo.ts
│   │   ├── escrow.repo.ts
│   │   ├── dispute.repo.ts
│   │   ├── flag.repo.ts
│   │   └── audit-log.repo.ts
│   └── services/
│       └── audit-log.service.ts (middleware for logging)
└── modules/
    ├── core/
    │   └── verification/
    │       ├── dto/
    │       │   ├── email-verification.dto.ts
    │       │   ├── phone-verification.dto.ts
    │       │   ├── kyc-verification.dto.ts
    │       │   └── verification-status.dto.ts
    │       ├── verification.service.ts
    │       ├── verification.controller.ts
    │       └── verification.module.ts
    ├── escrow/
    │   ├── dto/
    │   │   ├── create-escrow.dto.ts
    │   │   └── escrow-status.dto.ts
    │   ├── escrow.service.ts
    │   ├── escrow.controller.ts
    │   └── escrow.module.ts
    ├── disputes/
    │   ├── dto/
    │   │   ├── create-dispute.dto.ts
    │   │   ├── submit-evidence.dto.ts
    │   │   └── dispute-status.dto.ts
    │   ├── disputes.service.ts
    │   ├── disputes.controller.ts
    │   └── disputes.module.ts
    ├── moderation/
    │   ├── dto/
    │   │   ├── flag-resource.dto.ts
    │   │   ├── flag-status.dto.ts
    │   │   └── moderation-queue.dto.ts
    │   ├── moderation.service.ts
    │   ├── moderation.controller.ts
    │   └── moderation.module.ts
    └── audit-log/
        ├── audit-log.controller.ts
        └── audit-log.module.ts
```

### Phase 2: Database (Week 1-2)

```bash
# 1. Update prisma/schema.prisma with all new models from specs
# 2. Run migrations
npm run prisma:migrate dev -- --name "add-mvp-1.5-domains"

# 3. Update Prisma client
npm run prisma:generate
```

### Phase 3: Implementation (Weeks 2-5)

**Build in this order:**

1. Audit Logging (Week 1-2) — foundation, enables all others
2. User Verification (Week 2-3) — gate for high-value transactions
3. Admin Moderation (Week 3) — parallel with verification
4. Escrow & Payment (Week 4) — integrates with Stripe
5. Disputes (Week 5) — uses escrow + audit logs

### Phase 4: Testing & Integration (Week 6)

- Unit tests for each service
- Integration tests for full flows
- E2E tests (register → verify → create property → express interest → make offer → escrow → dispute)

---

## 📋 Complete File Checklist

### Enums to create:

- [ ] `src/common/enums/verification.enum.ts` — EmailVerificationStatus, PhoneVerificationStatus, KycVerificationStatus, UserVerificationStatus, KycDocumentType
- [ ] `src/common/enums/escrow.enum.ts` — EscrowStatus
- [ ] `src/common/enums/dispute.enum.ts` — DisputeStatus, DisputeReason
- [ ] `src/common/enums/moderation.enum.ts` — FlagReason, FlagStatus, SuspensionReason

### Repositories:

- [ ] `src/common/repos/verification.repo.ts` (EmailVerification queries)
- [ ] `src/common/repos/phone-verification.repo.ts` (PhoneVerification queries)
- [ ] `src/common/repos/kyc-document.repo.ts` (KycDocument queries)
- [ ] `src/common/repos/escrow.repo.ts` (Escrow queries)
- [ ] `src/common/repos/dispute.repo.ts` (Dispute queries)
- [ ] `src/common/repos/dispute-evidence.repo.ts` (DisputeEvidence queries)
- [ ] `src/common/repos/flag.repo.ts` (Flag queries)
- [ ] `src/common/repos/user-suspension.repo.ts` (UserSuspension queries)
- [ ] `src/common/repos/audit-log.repo.ts` (AuditLog queries)

### DTOs:

- [ ] Email verification: SendVerificationEmailDto, VerifyEmailDto, ResendVerificationEmailDto, EmailVerificationStatusDto
- [ ] Phone verification: SendPhoneVerificationCodeDto, VerifyPhoneCodeDto, PhoneVerificationStatusDto
- [ ] KYC: UploadKycDocumentDto, KycStatusDto, KycDocumentResponseDto
- [ ] Escrow: CreateEscrowDto, UpdateEscrowStatusDto, EscrowResponseDto
- [ ] Disputes: CreateDisputeDto, SubmitEvidenceDto, RespondToDisputeDto, DisputeDetailDto
- [ ] Moderation: FlagResourceDto, ResolveDisputeDto, SuspendUserDto, ModeratorQueueDto
- [ ] Audit: AuditLogFilterDto, AuditLogResponseDto

### Services:

- [ ] `src/modules/core/verification/verification.service.ts`
- [ ] `src/modules/escrow/escrow.service.ts`
- [ ] `src/modules/disputes/disputes.service.ts`
- [ ] `src/modules/moderation/moderation.service.ts`
- [ ] `src/common/services/audit-log.service.ts` (middleware)

### Controllers:

- [ ] `src/modules/core/verification/verification.controller.ts` (12 endpoints)
- [ ] `src/modules/escrow/escrow.controller.ts` (9 endpoints)
- [ ] `src/modules/disputes/disputes.controller.ts` (12 endpoints)
- [ ] `src/modules/moderation/moderation.controller.ts` (18 endpoints)
- [ ] `src/modules/audit-log/audit-log.controller.ts` (6 endpoints)

### Modules:

- [ ] `src/modules/core/verification/verification.module.ts`
- [ ] `src/modules/escrow/escrow.module.ts`
- [ ] `src/modules/disputes/disputes.module.ts`
- [ ] `src/modules/moderation/moderation.module.ts`
- [ ] `src/modules/audit-log/audit-log.module.ts`

### Integrations (Changes to existing files):

- [ ] Update `src/app.module.ts` — import new modules
- [ ] Update `prisma/schema.prisma` — extend User (verification fields), Transaction (escrowId, disputeId)
- [ ] Update `src/modules/core/auth/auth.service.ts` — gate registration by email verification
- [ ] Update `src/modules/properties/properties.service.ts` — require verification for property creation
- [ ] Update `src/modules/transactions/transactions.service.ts` — initiate escrow on transaction creation
- [ ] Update `src/modules/transactions/transactions.controller.ts` — handle escrow webhook
- [ ] Add audit logging middleware to `src/app.module.ts`

### Environment variables:

```env
# Verification
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
VERIFICATION_TOKEN_EXPIRY_MINUTES=30
KYC_MAX_FILE_SIZE_MB=5
CLOUDINARY_FOLDER_KYC=kyc-documents

# Escrow
STRIPE_CONNECT_CLIENT_ID=
STRIPE_REDIRECT_URI=http://localhost:3000/auth/stripe-callback
ESCROW_HOLD_DAYS=14

# Disputes
DISPUTE_AUTO_RESOLVE_DAYS=30
DISPUTE_APPEAL_WINDOW_DAYS=7

# Moderation
AUTO_SUSPEND_FLAG_THRESHOLD=5
FLAG_RETENTION_DAYS=90

# Audit
AUDIT_LOG_ARCHIVE_AFTER_DAYS=90
AUDIT_LOG_ARCHIVE_DB_URL=
```

---

## 🔗 Database Integration Changes

### User model changes:

```prisma
model User {
  // ... existing fields ...

  // NEW: Verification fields
  emailVerified Boolean @default(false)
  emailVerifiedAt DateTime?
  phoneVerified Boolean @default(false)
  phoneVerifiedAt DateTime?
  kycVerified Boolean @default(false)
  kycVerifiedAt DateTime?
  verificationStatus UserVerificationStatus @default(UNVERIFIED)

  // NEW: Relations
  emailVerifications EmailVerification[]
  phoneVerifications PhoneVerification[]
  kycDocuments KycDocument[]
  flagsInitiated Flag[] @relation("FlaggedBy")
  flagsReceived Flag[] @relation("FlaggedUser")
  suspensions UserSuspension[]
  disputesInitiated Dispute[] @relation("DisputeInitiator")
  disputesDefending Dispute[] @relation("DisputeDefender")
}
```

### Transaction model changes:

```prisma
model Transaction {
  // ... existing fields ...

  // NEW: Escrow integration
  escrowId String?
  escrow Escrow? @relation(fields: [escrowId], references: [id])

  // NEW: Dispute integration
  disputeId String?
  dispute Dispute? @relation(fields: [disputeId], references: [id])

  @@index([escrowId])
  @@index([disputeId])
}
```

---

## 📊 Endpoint Summary

**Total: ~65 new endpoints**

### Verification (12 endpoints)

```
POST   /auth/email/send-verification
POST   /auth/email/verify
POST   /auth/email/resend-verification
GET    /auth/email/verification-status
POST   /auth/phone/send-code
POST   /auth/phone/verify
GET    /auth/phone/verification-status
POST   /auth/identity/upload-document
GET    /auth/identity/kyc-status
GET    /auth/identity/documents
PATCH  /auth/identity/resubmit
GET    /auth/verification-status
```

### Escrow (9 endpoints)

```
POST   /escrow/create
PATCH  /escrow/:id/release
PATCH  /escrow/:id/return
GET    /escrow/:id/status
GET    /escrow/transaction/:transactionId
POST   /escrow/:id/dispute-freeze
PATCH  /escrow/:id/admin-override
GET    /escrow/reports
PATCH  /escrow/:id/webhook (Stripe callback)
```

### Disputes (12 endpoints)

```
POST   /disputes/create
POST   /disputes/:id/evidence
GET    /disputes/:id
GET    /disputes/my-disputes
GET    /disputes/queue (admin)
PATCH  /disputes/:id/respond
PATCH  /disputes/:id/mediate (admin)
PATCH  /disputes/:id/resolve (admin)
POST   /disputes/:id/appeal
GET    /disputes/:id/audit-trail
DELETE /disputes/:id/evidence/:evidenceId
GET    /disputes/metrics (admin)
PATCH  /disputes/:id/reopen (admin)
```

### Moderation (18 endpoints)

```
POST   /moderation/flag
GET    /moderation/flags/queue (admin)
GET    /moderation/flags/:id (admin)
PATCH  /moderation/flags/:id/resolve (admin)
PATCH  /moderation/flags/:id/dismiss (admin)
POST   /moderation/suspend (admin)
PATCH  /moderation/suspension/:suspensionId/lift (admin)
GET    /moderation/suspensions (admin)
GET    /moderation/user/:userId/history (admin)
GET    /moderation/property/:propertyId/flags (admin)
PATCH  /moderation/auto-suspend-config (admin)
GET    /moderation/metrics (admin)
GET    /moderation/appeals (admin)
PATCH  /moderation/appeals/:id/approve (admin)
PATCH  /moderation/appeals/:id/reject (admin)
DELETE /moderation/flag/:flagId (admin soft-delete)
GET    /moderation/dashboard (admin)
POST   /moderation/bulk-action (admin)
```

### Audit Logging (6 endpoints)

```
GET    /audit/transaction/:transactionId
GET    /audit/property/:propertyId
GET    /audit/user/:userId
GET    /audit/reports
GET    /audit/search
POST   /audit/export
```

---

## 🧪 Testing Checklist

### Unit Tests:

- [ ] EmailVerificationService (token generation, validation, expiry)
- [ ] PhoneVerificationService (code validation, rate limiting)
- [ ] KycService (document validation, status tracking)
- [ ] EscrowService (hold logic, release conditions)
- [ ] DisputeService (state transitions, mediation workflow)
- [ ] FlagService (auto-suspend logic, appeal process)
- [ ] AuditLogService (logging accuracy, archival)

### Integration Tests:

- [ ] Email verification flow (register → send → verify → gate)
- [ ] Escrow flow (transaction → hold → release/return)
- [ ] Dispute flow (open → evidence → mediation → resolve)
- [ ] Moderation flow (flag → review → resolve/appeal)
- [ ] Audit logging (every action logged, searchable)

### E2E Tests:

- [ ] Complete transaction with verification gate
- [ ] Transaction with escrow hold → inspection pass → release
- [ ] Transaction with dispute → resolution
- [ ] User flagged → auto-suspended → appeal → approved

---

## ⚠️ Critical Risks & Mitigations

**Risk 1: Escrow money loss**

- Mitigation: Manual verification for first 100 transactions, thorough testing, use Stripe Connect (not DIY)

**Risk 2: Dispute abuse (frivolous claims)**

- Mitigation: 24h cool-off before opening, dispute history on profile, appeal requires new evidence

**Risk 3: Audit logs grow exponentially**

- Mitigation: Archive to separate DB after 90 days, aggressive cleanup policy

**Risk 4: KYC document storage is PII**

- Mitigation: Encrypt at rest, access controls, retention policy (delete after 2 years)

**Risk 5: Verification gates slow down transactions**

- Mitigation: Email verification instant, phone optional, KYC only for >$500K

---

## 📅 Weekly Roadmap

**Week 1:**

- [ ] Database schema (Prisma + migrations)
- [ ] Audit logging middleware (foundation)
- [ ] All enums and DTOs
- [ ] Repo layer (all repos)

**Week 2:**

- [ ] Verification service (email + phone)
- [ ] Verification controller + endpoints
- [ ] Verification integration with auth module
- [ ] Gate property creation on verification

**Week 3:**

- [ ] Admin moderation service & controller
- [ ] Flag resource endpoints
- [ ] Suspend user endpoints
- [ ] Admin moderation dashboard (basic)

**Week 4:**

- [ ] Escrow service & controller
- [ ] Stripe Connect integration
- [ ] Webhook handler for payment release
- [ ] Transaction service updates

**Week 5:**

- [ ] Dispute service & controller
- [ ] Mediation workflow
- [ ] Evidence upload & storage
- [ ] Auto-resolution logic

**Week 6:**

- [ ] All unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Production rollout + monitoring

---

## ✅ Pre-Merge Checklist

Before shipping each domain:

**Code Quality:**

- [ ] No `any` in services
- [ ] All repos wrapped in try/catch → RepoError
- [ ] All services throw HttpException
- [ ] All DTOs have class-validator decorators
- [ ] All endpoints have @UseGuards(JwtAuthGuard) if needed
- [ ] All endpoints documented in Swagger

**Architecture:**

- [ ] Controllers only extract & call service
- [ ] Services contain business logic only
- [ ] Repos contain Prisma only
- [ ] One job per file
- [ ] No hardcoded values (all env vars)
- [ ] Absolute imports (@common/_, @lib/_)

**Testing:**

- [ ] npm run test passes (unit tests)
- [ ] npm run lint passes (ESLint)
- [ ] npm run error passes (TypeScript clean)
- [ ] npm run build succeeds

**Security:**

- [ ] No passwords in logs
- [ ] Tokens hashed before storage
- [ ] Rate limiting on verification endpoints
- [ ] KYC documents encrypted at rest
- [ ] Audit logs immutable

**Performance:**

- [ ] Indexes on frequently-queried fields
- [ ] No N+1 queries
- [ ] Pagination implemented
- [ ] Rate limiting active

---

## 📥 How to Get the Full Specs

All detailed specifications are in:

```
MVP_1.5_COMPLETE_DESIGN_SPECS.json
```

This JSON file contains for each domain:

1. Complete Prisma schema (copy-paste)
2. All endpoint specs with DTOs
3. Service method signatures
4. Repository queries
5. Controller endpoint handlers
6. Module wiring
7. Integration points
8. External dependencies
9. Risks & notes
10. Testing strategy

**Extract and read by domain** to implement each module.

---

## 🚀 Next Steps

1. **Download** `MVP_1.5_COMPLETE_DESIGN_SPECS.json`
2. **Read** the Verification domain first (simplest)
3. **Copy** Prisma schema sections into `schema.prisma`
4. **Create** file structure (enums, DTOs, repos, services, controllers)
5. **Implement** service methods (copy signatures from spec)
6. **Test** each layer
7. **Integrate** with existing modules
8. **Ship** Week 1 (Verification + Audit Logging)

You're now **production-ready to start implementation.**

Good luck! 🚀
