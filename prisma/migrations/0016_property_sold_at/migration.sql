-- AlterTable
ALTER TABLE "public"."Property" ADD COLUMN     "soldAt" TIMESTAMP(3);

UPDATE "public"."Property" AS p
SET "soldAt" = COALESCE(
    (
        SELECT MAX(t."completedAt")
        FROM "public"."Transaction" AS t
        WHERE t."propertyId" = p."id" AND t."status" = 'COMPLETED'
    ),
    p."updatedAt"
)
WHERE p."status" = 'SOLD';
