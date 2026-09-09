-- CreateEnum
CREATE TYPE "public"."Contingency" AS ENUM ('INSPECTION', 'APPRAISAL', 'FINANCING');

-- CreateEnum
CREATE TYPE "public"."MilestoneKind" AS ENUM ('INSPECTION', 'APPRAISAL', 'FINANCING', 'CLOSING');

-- CreateEnum
CREATE TYPE "public"."MilestoneStatus" AS ENUM ('PENDING', 'SCHEDULED', 'COMPLETED', 'WAIVED');

-- AlterTable
ALTER TABLE "public"."Offer" ADD COLUMN "moveInDate" TIMESTAMP(3),
    ADD COLUMN "earnestMoney" DECIMAL(14,2),
    ADD COLUMN "contingencies" "public"."Contingency"[] DEFAULT ARRAY[]::"public"."Contingency"[];

-- CreateTable
CREATE TABLE "public"."DealMilestone" (
    "id" TEXT NOT NULL,
    "note" TEXT,
    "appraisedValue" DECIMAL(14,2),
    "documentUrl" TEXT,
    "documentName" TEXT,
    "documentPublicId" TEXT,
    "kind" "public"."MilestoneKind" NOT NULL,
    "status" "public"."MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "offerId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DealMilestone_offerId_kind_key" ON "public"."DealMilestone"("offerId" ASC, "kind" ASC);

-- CreateIndex
CREATE INDEX "DealMilestone_offerId_idx" ON "public"."DealMilestone"("offerId" ASC);

-- CreateIndex
CREATE INDEX "DealMilestone_status_idx" ON "public"."DealMilestone"("status" ASC);

-- AddForeignKey
ALTER TABLE "public"."DealMilestone" ADD CONSTRAINT "DealMilestone_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "public"."Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
