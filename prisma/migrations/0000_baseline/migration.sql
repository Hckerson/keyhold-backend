
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."AuditActionType" AS ENUM ('USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'USER_SUSPENDED', 'PROPERTY_CREATED', 'PROPERTY_UPDATED', 'PROPERTY_DELETED', 'PROPERTY_FLAGGED', 'TRANSACTION_CREATED', 'TRANSACTION_UPDATED', 'TRANSACTION_COMPLETED', 'OFFER_CREATED', 'OFFER_ACCEPTED', 'DISPUTE_CREATED', 'DISPUTE_RESOLVED', 'LOGIN', 'LOGOUT');

-- CreateEnum
CREATE TYPE "public"."ConciergeRequestStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."ConciergeStatus" AS ENUM ('ACQUIRING', 'UNDER_CONTRACT', 'DIVESTING', 'DORMANT');

-- CreateEnum
CREATE TYPE "public"."ConciergeTier" AS ENUM ('PREMIUM', 'VIP', 'PLATINUM');

-- CreateEnum
CREATE TYPE "public"."ConnectionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."Day" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

-- CreateEnum
CREATE TYPE "public"."DisputeEvidenceType" AS ENUM ('MESSAGE', 'PHOTO', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "public"."DisputeStatus" AS ENUM ('OPEN', 'PENDING_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "public"."EscrowStatus" AS ENUM ('HELD', 'RELEASED', 'REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "public"."FlagStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "public"."FlagType" AS ENUM ('USER', 'PROPERTY', 'MESSAGE');

-- CreateEnum
CREATE TYPE "public"."Month" AS ENUM ('JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC');

-- CreateEnum
CREATE TYPE "public"."NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'IN_APP');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('PRICE_DROP', 'NEW_LISTING', 'UNDER_OFFER', 'STATUS_CHANGE', 'OFFER_RESPONSE', 'VIEWING_CONFIRMATION', 'MESSAGE_RECEIVED', 'CONNECTION_REQUEST');

-- CreateEnum
CREATE TYPE "public"."OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."PropertyStatus" AS ENUM ('DRAFT', 'AVAILABLE', 'PENDING', 'SOLD', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."PropertyType" AS ENUM ('ESTATE', 'VILLA', 'PENTHOUSE', 'HOUSE', 'APARTMENT', 'CONDO', 'TOWNHOUSE', 'LAND', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ServiceComponent" AS ENUM ('DATABASE', 'API', 'SEARCH', 'STORAGE', 'PAYMENTS');

-- CreateEnum
CREATE TYPE "public"."SettingCategory" AS ENUM ('PLATFORM', 'COMMERCE', 'MODERATION', 'AVAILABILITY');

-- CreateEnum
CREATE TYPE "public"."TransactionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."UserAccountStatus" AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'BUYER', 'SELLER');

-- CreateEnum
CREATE TYPE "public"."UserTier" AS ENUM ('STANDARD', 'PREMIUM', 'PLATINUM');

-- CreateEnum
CREATE TYPE "public"."VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."VerificationType" AS ENUM ('EMAIL', 'PHONE', 'KYC', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "public"."ViewingMode" AS ENUM ('IN_PERSON', 'VIRTUAL', 'OPEN_HOUSE');

-- CreateEnum
CREATE TYPE "public"."ViewingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "action" "public"."AuditActionType" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConciergeClient" (
    "id" TEXT NOT NULL,
    "budget" DECIMAL(14,2) NOT NULL,
    "allocated" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "clientSince" INTEGER NOT NULL,
    "nextAction" TEXT,
    "lastContact" TIMESTAMP(3),
    "tier" "public"."ConciergeTier" NOT NULL DEFAULT 'PREMIUM',
    "status" "public"."ConciergeStatus" NOT NULL DEFAULT 'ACQUIRING',
    "agentId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConciergeClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConciergePractice" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConciergePractice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConciergePracticeCoverage" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConciergePracticeCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConciergeService" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "agentId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConciergeService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConciergeServiceRequest" (
    "id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "status" "public"."ConciergeRequestStatus" NOT NULL DEFAULT 'OPEN',
    "serviceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConciergeServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Connection" (
    "id" TEXT NOT NULL,
    "status" "public"."ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "buyerId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Dispute" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "public"."DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolutionNotes" TEXT,
    "initiatorId" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DisputeEvidence" (
    "id" TEXT NOT NULL,
    "type" "public"."DisputeEvidenceType" NOT NULL,
    "content" TEXT NOT NULL,
    "label" TEXT,
    "disputeId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Escrow" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "inspectionEndDate" TIMESTAMP(3) NOT NULL,
    "stripeTransferId" TEXT,
    "stripeAccountId" TEXT,
    "status" "public"."EscrowStatus" NOT NULL DEFAULT 'HELD',
    "releasedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Escrow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Flag" (
    "id" TEXT NOT NULL,
    "type" "public"."FlagType" NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" "public"."FlagStatus" NOT NULL DEFAULT 'ACTIVE',
    "targetId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Flag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IdentityDocument" (
    "id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "issuerCountry" TEXT NOT NULL,
    "documentImageUrl" TEXT NOT NULL,
    "faceImageUrl" TEXT,
    "status" "public"."VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "userId" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Message" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "connectionId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "type" "public"."NotificationType" NOT NULL,
    "channel" "public"."NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "entityType" TEXT,
    "entityId" TEXT,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NotificationPreference" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT true,
    "sms" BOOLEAN NOT NULL DEFAULT false,
    "inApp" BOOLEAN NOT NULL DEFAULT true,
    "type" "public"."NotificationType" NOT NULL,
    "userId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Offer" (
    "id" TEXT NOT NULL,
    "offeredPrice" DOUBLE PRECISION NOT NULL,
    "offeredTerms" TEXT NOT NULL,
    "responsePrice" DOUBLE PRECISION,
    "responseFeedback" TEXT,
    "status" "public"."OfferStatus" NOT NULL DEFAULT 'PENDING',
    "connectionId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "offererId" TEXT NOT NULL,
    "responseFromId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PhoneVerification" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" "public"."SettingCategory" NOT NULL DEFAULT 'PLATFORM',
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."Property" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "locality" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'US',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "price" DOUBLE PRECISION NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "sqFt" DOUBLE PRECISION,
    "lotSqFt" DOUBLE PRECISION,
    "yearBuilt" INTEGER,
    "walkScore" INTEGER,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "amenities" TEXT[],
    "features" TEXT[],
    "type" "public"."PropertyType" NOT NULL,
    "status" "public"."PropertyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "sellerId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PropertyImage" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "propertyId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Review" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "transactionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "revieweeId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SavedProperty" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SavedSearch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locality" TEXT,
    "minPrice" DECIMAL(14,2),
    "maxPrice" DECIMAL(14,2),
    "minBedrooms" INTEGER,
    "minBathrooms" INTEGER,
    "minSqFt" INTEGER,
    "notify" BOOLEAN NOT NULL DEFAULT true,
    "propertyType" "public"."PropertyType",
    "buyerId" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ServiceMetric" (
    "id" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "failed" BOOLEAN NOT NULL DEFAULT false,
    "component" "public"."ServiceComponent" NOT NULL DEFAULT 'API',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Transaction" (
    "id" TEXT NOT NULL,
    "finalPrice" DOUBLE PRECISION NOT NULL,
    "terms" TEXT NOT NULL,
    "agreementDocUrl" TEXT,
    "stripePaymentIntentId" TEXT,
    "status" "public"."TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "connectionId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "escrowHoldId" TEXT,
    "disputeId" TEXT,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "avatar" TEXT,
    "bio" TEXT,
    "year" INTEGER NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "status" "public"."UserAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "tier" "public"."UserTier" NOT NULL DEFAULT 'STANDARD',
    "jobTitle" TEXT,
    "agencyName" TEXT,
    "licenseNumber" TEXT,
    "day" "public"."Day" NOT NULL,
    "month" "public"."Month" NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "kycVerified" BOOLEAN NOT NULL DEFAULT false,
    "kycRejected" BOOLEAN NOT NULL DEFAULT false,
    "lastActive" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserSuspension" (
    "id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "duration" INTEGER,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "liftedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSuspension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "public"."VerificationType" NOT NULL,
    "status" "public"."VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Viewing" (
    "id" TEXT NOT NULL,
    "proposedTimes" TEXT[],
    "notes" TEXT,
    "status" "public"."ViewingStatus" NOT NULL DEFAULT 'PENDING',
    "connectionId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "proposedByid" TEXT NOT NULL,
    "confirmedById" TEXT,
    "confirmedTime" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "mode" "public"."ViewingMode" NOT NULL DEFAULT 'IN_PERSON',

    CONSTRAINT "Viewing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "public"."AuditLog"("action" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "public"."AuditLog"("actorId" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "public"."AuditLog"("entityId" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "public"."AuditLog"("entityType" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ConciergeClient_agentId_clientId_key" ON "public"."ConciergeClient"("agentId" ASC, "clientId" ASC);

-- CreateIndex
CREATE INDEX "ConciergeClient_agentId_idx" ON "public"."ConciergeClient"("agentId" ASC);

-- CreateIndex
CREATE INDEX "ConciergeClient_clientId_idx" ON "public"."ConciergeClient"("clientId" ASC);

-- CreateIndex
CREATE INDEX "ConciergeClient_status_idx" ON "public"."ConciergeClient"("status" ASC);

-- CreateIndex
CREATE INDEX "ConciergeClient_tier_idx" ON "public"."ConciergeClient"("tier" ASC);

-- CreateIndex
CREATE INDEX "ConciergePractice_agentId_idx" ON "public"."ConciergePractice"("agentId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ConciergePractice_agentId_key_key" ON "public"."ConciergePractice"("agentId" ASC, "key" ASC);

-- CreateIndex
CREATE INDEX "ConciergePracticeCoverage_clientId_idx" ON "public"."ConciergePracticeCoverage"("clientId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ConciergePracticeCoverage_practiceId_clientId_key" ON "public"."ConciergePracticeCoverage"("practiceId" ASC, "clientId" ASC);

-- CreateIndex
CREATE INDEX "ConciergePracticeCoverage_practiceId_idx" ON "public"."ConciergePracticeCoverage"("practiceId" ASC);

-- CreateIndex
CREATE INDEX "ConciergeService_agentId_idx" ON "public"."ConciergeService"("agentId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ConciergeService_agentId_key_key" ON "public"."ConciergeService"("agentId" ASC, "key" ASC);

-- CreateIndex
CREATE INDEX "ConciergeServiceRequest_clientId_idx" ON "public"."ConciergeServiceRequest"("clientId" ASC);

-- CreateIndex
CREATE INDEX "ConciergeServiceRequest_serviceId_idx" ON "public"."ConciergeServiceRequest"("serviceId" ASC);

-- CreateIndex
CREATE INDEX "ConciergeServiceRequest_status_idx" ON "public"."ConciergeServiceRequest"("status" ASC);

-- CreateIndex
CREATE INDEX "Connection_buyerId_idx" ON "public"."Connection"("buyerId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Connection_buyerId_propertyId_key" ON "public"."Connection"("buyerId" ASC, "propertyId" ASC);

-- CreateIndex
CREATE INDEX "Connection_sellerId_idx" ON "public"."Connection"("sellerId" ASC);

-- CreateIndex
CREATE INDEX "Connection_status_idx" ON "public"."Connection"("status" ASC);

-- CreateIndex
CREATE INDEX "Dispute_initiatorId_idx" ON "public"."Dispute"("initiatorId" ASC);

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "public"."Dispute"("status" ASC);

-- CreateIndex
CREATE INDEX "DisputeEvidence_disputeId_idx" ON "public"."DisputeEvidence"("disputeId" ASC);

-- CreateIndex
CREATE INDEX "Escrow_status_idx" ON "public"."Escrow"("status" ASC);

-- CreateIndex
CREATE INDEX "Flag_creatorId_idx" ON "public"."Flag"("creatorId" ASC);

-- CreateIndex
CREATE INDEX "Flag_status_idx" ON "public"."Flag"("status" ASC);

-- CreateIndex
CREATE INDEX "Flag_targetId_idx" ON "public"."Flag"("targetId" ASC);

-- CreateIndex
CREATE INDEX "Flag_type_idx" ON "public"."Flag"("type" ASC);

-- CreateIndex
CREATE INDEX "IdentityDocument_status_idx" ON "public"."IdentityDocument"("status" ASC);

-- CreateIndex
CREATE INDEX "IdentityDocument_userId_idx" ON "public"."IdentityDocument"("userId" ASC);

-- CreateIndex
CREATE INDEX "Message_connectionId_idx" ON "public"."Message"("connectionId" ASC);

-- CreateIndex
CREATE INDEX "Message_receiverId_idx" ON "public"."Message"("receiverId" ASC);

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "public"."Message"("senderId" ASC);

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "public"."Notification"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "public"."Notification"("isRead" ASC);

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "public"."Notification"("type" ASC);

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "public"."Notification"("userId" ASC);

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_idx" ON "public"."NotificationPreference"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_type_key" ON "public"."NotificationPreference"("userId" ASC, "type" ASC);

-- CreateIndex
CREATE INDEX "Offer_connectionId_idx" ON "public"."Offer"("connectionId" ASC);

-- CreateIndex
CREATE INDEX "Offer_offererId_idx" ON "public"."Offer"("offererId" ASC);

-- CreateIndex
CREATE INDEX "Offer_propertyId_idx" ON "public"."Offer"("propertyId" ASC);

-- CreateIndex
CREATE INDEX "Offer_responseFromId_idx" ON "public"."Offer"("responseFromId" ASC);

-- CreateIndex
CREATE INDEX "Offer_status_idx" ON "public"."Offer"("status" ASC);

-- CreateIndex
CREATE INDEX "PhoneVerification_phone_idx" ON "public"."PhoneVerification"("phone" ASC);

-- CreateIndex
CREATE INDEX "PhoneVerification_status_idx" ON "public"."PhoneVerification"("status" ASC);

-- CreateIndex
CREATE INDEX "PhoneVerification_userId_idx" ON "public"."PhoneVerification"("userId" ASC);

-- CreateIndex
CREATE INDEX "PlatformSetting_category_idx" ON "public"."PlatformSetting"("category" ASC);

-- CreateIndex
CREATE INDEX "Property_locality_idx" ON "public"."Property"("locality" ASC);

-- CreateIndex
CREATE INDEX "Property_price_idx" ON "public"."Property"("price" ASC);

-- CreateIndex
CREATE INDEX "Property_sellerId_idx" ON "public"."Property"("sellerId" ASC);

-- CreateIndex
CREATE INDEX "Property_status_idx" ON "public"."Property"("status" ASC);

-- CreateIndex
CREATE INDEX "Property_type_idx" ON "public"."Property"("type" ASC);

-- CreateIndex
CREATE INDEX "PropertyImage_propertyId_idx" ON "public"."PropertyImage"("propertyId" ASC);

-- CreateIndex
CREATE INDEX "Review_revieweeId_idx" ON "public"."Review"("revieweeId" ASC);

-- CreateIndex
CREATE INDEX "Review_reviewerId_idx" ON "public"."Review"("reviewerId" ASC);

-- CreateIndex
CREATE INDEX "Review_transactionId_idx" ON "public"."Review"("transactionId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Review_transactionId_reviewerId_key" ON "public"."Review"("transactionId" ASC, "reviewerId" ASC);

-- CreateIndex
CREATE INDEX "SavedProperty_buyerId_idx" ON "public"."SavedProperty"("buyerId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "SavedProperty_buyerId_propertyId_key" ON "public"."SavedProperty"("buyerId" ASC, "propertyId" ASC);

-- CreateIndex
CREATE INDEX "SavedProperty_propertyId_idx" ON "public"."SavedProperty"("propertyId" ASC);

-- CreateIndex
CREATE INDEX "SavedSearch_buyerId_idx" ON "public"."SavedSearch"("buyerId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "SavedSearch_buyerId_name_key" ON "public"."SavedSearch"("buyerId" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "ServiceMetric_component_createdAt_idx" ON "public"."ServiceMetric"("component" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "ServiceMetric_createdAt_idx" ON "public"."ServiceMetric"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "Transaction_buyerId_idx" ON "public"."Transaction"("buyerId" ASC);

-- CreateIndex
CREATE INDEX "Transaction_connectionId_idx" ON "public"."Transaction"("connectionId" ASC);

-- CreateIndex
CREATE INDEX "Transaction_disputeId_idx" ON "public"."Transaction"("disputeId" ASC);

-- CreateIndex
CREATE INDEX "Transaction_escrowHoldId_idx" ON "public"."Transaction"("escrowHoldId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_escrowHoldId_key" ON "public"."Transaction"("escrowHoldId" ASC);

-- CreateIndex
CREATE INDEX "Transaction_propertyId_idx" ON "public"."Transaction"("propertyId" ASC);

-- CreateIndex
CREATE INDEX "Transaction_sellerId_idx" ON "public"."Transaction"("sellerId" ASC);

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "public"."Transaction"("status" ASC);

-- CreateIndex
CREATE INDEX "User_emailVerified_idx" ON "public"."User"("emailVerified" ASC);

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email" ASC);

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role" ASC);

-- CreateIndex
CREATE INDEX "User_status_idx" ON "public"."User"("status" ASC);

-- CreateIndex
CREATE INDEX "User_tier_idx" ON "public"."User"("tier" ASC);

-- CreateIndex
CREATE INDEX "UserSuspension_userId_idx" ON "public"."UserSuspension"("userId" ASC);

-- CreateIndex
CREATE INDEX "VerificationToken_status_idx" ON "public"."VerificationToken"("status" ASC);

-- CreateIndex
CREATE INDEX "VerificationToken_token_idx" ON "public"."VerificationToken"("token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token" ASC);

-- CreateIndex
CREATE INDEX "VerificationToken_userId_idx" ON "public"."VerificationToken"("userId" ASC);

-- CreateIndex
CREATE INDEX "Viewing_connectionId_idx" ON "public"."Viewing"("connectionId" ASC);

-- CreateIndex
CREATE INDEX "Viewing_propertyId_idx" ON "public"."Viewing"("propertyId" ASC);

-- CreateIndex
CREATE INDEX "Viewing_proposedByid_idx" ON "public"."Viewing"("proposedByid" ASC);

-- CreateIndex
CREATE INDEX "Viewing_requestedById_idx" ON "public"."Viewing"("requestedById" ASC);

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConciergeClient" ADD CONSTRAINT "ConciergeClient_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConciergeClient" ADD CONSTRAINT "ConciergeClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConciergePractice" ADD CONSTRAINT "ConciergePractice_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConciergePracticeCoverage" ADD CONSTRAINT "ConciergePracticeCoverage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."ConciergeClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConciergePracticeCoverage" ADD CONSTRAINT "ConciergePracticeCoverage_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "public"."ConciergePractice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConciergeService" ADD CONSTRAINT "ConciergeService_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConciergeServiceRequest" ADD CONSTRAINT "ConciergeServiceRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."ConciergeClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConciergeServiceRequest" ADD CONSTRAINT "ConciergeServiceRequest_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."ConciergeService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Connection" ADD CONSTRAINT "Connection_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Connection" ADD CONSTRAINT "Connection_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Connection" ADD CONSTRAINT "Connection_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Dispute" ADD CONSTRAINT "Dispute_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DisputeEvidence" ADD CONSTRAINT "DisputeEvidence_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "public"."Dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Flag" ADD CONSTRAINT "Flag_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IdentityDocument" ADD CONSTRAINT "IdentityDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "public"."Connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Offer" ADD CONSTRAINT "Offer_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "public"."Connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Offer" ADD CONSTRAINT "Offer_offererId_fkey" FOREIGN KEY ("offererId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Offer" ADD CONSTRAINT "Offer_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Offer" ADD CONSTRAINT "Offer_responseFromId_fkey" FOREIGN KEY ("responseFromId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PhoneVerification" ADD CONSTRAINT "PhoneVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlatformSetting" ADD CONSTRAINT "PlatformSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Property" ADD CONSTRAINT "Property_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PropertyImage" ADD CONSTRAINT "PropertyImage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_revieweeId_fkey" FOREIGN KEY ("revieweeId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SavedProperty" ADD CONSTRAINT "SavedProperty_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SavedProperty" ADD CONSTRAINT "SavedProperty_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SavedSearch" ADD CONSTRAINT "SavedSearch_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "public"."Connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "public"."Dispute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_escrowHoldId_fkey" FOREIGN KEY ("escrowHoldId") REFERENCES "public"."Escrow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSuspension" ADD CONSTRAINT "UserSuspension_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VerificationToken" ADD CONSTRAINT "VerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Viewing" ADD CONSTRAINT "Viewing_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "public"."Connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Viewing" ADD CONSTRAINT "Viewing_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Viewing" ADD CONSTRAINT "Viewing_proposedByid_fkey" FOREIGN KEY ("proposedByid") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Viewing" ADD CONSTRAINT "Viewing_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

