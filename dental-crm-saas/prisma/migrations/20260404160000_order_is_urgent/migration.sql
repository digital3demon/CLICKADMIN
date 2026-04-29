-- AlterTable
ALTER TABLE "Order" ADD COLUMN "isUrgent" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Order" SET "isUrgent" = true WHERE "urgentCoefficient" IS NOT NULL;
