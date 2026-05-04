-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "correctionReason" TEXT,
ADD COLUMN     "correctionPaid" BOOLEAN NOT NULL DEFAULT false;
