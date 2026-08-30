-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "featuredUntil" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Property_featuredUntil_idx" ON "Property"("featuredUntil");
