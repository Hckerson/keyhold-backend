-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "day",
DROP COLUMN "month",
DROP COLUMN "year";

-- DropEnum
DROP TYPE "public"."Day";

-- DropEnum
DROP TYPE "public"."Month";

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "public"."User"("createdAt");
