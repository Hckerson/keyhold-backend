-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "requestId" TEXT;

-- AlterTable
ALTER TABLE "ServiceMetric" ADD COLUMN     "requestId" TEXT;
