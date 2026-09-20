-- AlterTable
ALTER TABLE "public"."CalendarConnection" ADD COLUMN     "lastSyncAt" TIMESTAMP(3),
ADD COLUMN     "lastSyncError" TEXT,
ADD COLUMN     "lastSyncErrorAt" TIMESTAMP(3);
