-- CreateEnum
CREATE TYPE "public"."AuthProvider" AS ENUM ('GOOGLE', 'FACEBOOK');

-- AlterTable
ALTER TABLE "public"."Viewing" ADD COLUMN "googleEventId" TEXT;

-- CreateTable
CREATE TABLE "public"."AuthIdentity" (
    "id" TEXT NOT NULL,
    "provider" "public"."AuthProvider" NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "email" TEXT,
    "userId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CalendarConnection" (
    "id" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "googleEmail" TEXT,
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "userId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthIdentity_provider_providerUserId_key" ON "public"."AuthIdentity"("provider", "providerUserId");

-- CreateIndex
CREATE INDEX "AuthIdentity_userId_idx" ON "public"."AuthIdentity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarConnection_userId_key" ON "public"."CalendarConnection"("userId");

-- AddForeignKey
ALTER TABLE "public"."AuthIdentity" ADD CONSTRAINT "AuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CalendarConnection" ADD CONSTRAINT "CalendarConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
