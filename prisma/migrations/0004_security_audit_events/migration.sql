-- AlterEnum
ALTER TYPE "AuditActionType" ADD VALUE 'LOGIN_SUCCEEDED';
ALTER TYPE "AuditActionType" ADD VALUE 'LOGIN_FAILED';
ALTER TYPE "AuditActionType" ADD VALUE 'PERMISSION_DENIED';

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_actorId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "actorId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
