-- AlterTable
ALTER TABLE "public"."VerificationToken" ADD COLUMN "code" TEXT;
ALTER TABLE "public"."VerificationToken" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN "avatarPublicId" TEXT;
