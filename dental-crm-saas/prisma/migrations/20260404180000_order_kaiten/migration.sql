-- AlterTable
ALTER TABLE "Order" ADD COLUMN "kaitenDecideLater" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "kaitenAssignmentType" TEXT;
ALTER TABLE "Order" ADD COLUMN "kaitenTrackLane" TEXT;
