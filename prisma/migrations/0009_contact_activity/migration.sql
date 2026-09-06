-- CreateEnum
CREATE TYPE "public"."ContactChannel" AS ENUM ('EMAIL', 'SMS', 'CALL');

-- CreateEnum
CREATE TYPE "public"."ContactDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "public"."ContactStatus" AS ENUM ('QUEUED', 'SENT', 'RINGING', 'COMPLETED', 'NO_ANSWER', 'FAILED');

-- CreateTable
CREATE TABLE "public"."ContactActivity" (
    "id" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "providerRef" TEXT,
    "durationSeconds" INTEGER,
    "channel" "public"."ContactChannel" NOT NULL,
    "direction" "public"."ContactDirection" NOT NULL DEFAULT 'OUTBOUND',
    "status" "public"."ContactStatus" NOT NULL DEFAULT 'QUEUED',
    "connectionId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactActivity_connectionId_occurredAt_idx" ON "public"."ContactActivity"("connectionId" ASC, "occurredAt" ASC);

-- CreateIndex
CREATE INDEX "ContactActivity_actorId_idx" ON "public"."ContactActivity"("actorId" ASC);

-- CreateIndex
CREATE INDEX "ContactActivity_providerRef_idx" ON "public"."ContactActivity"("providerRef" ASC);

-- AddForeignKey
ALTER TABLE "public"."ContactActivity" ADD CONSTRAINT "ContactActivity_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "public"."Connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContactActivity" ADD CONSTRAINT "ContactActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
