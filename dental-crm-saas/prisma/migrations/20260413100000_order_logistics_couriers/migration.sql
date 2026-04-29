-- CreateTable
CREATE TABLE "Courier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Courier_isActive_sortOrder_idx" ON "Courier"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "Courier_name_idx" ON "Courier"("name");

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "invoiceNumber" TEXT;
ALTER TABLE "Order" ADD COLUMN "invoicePaperDocs" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "invoiceSentToEdo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "invoiceEdoSigned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "narjadPrinted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "adminShippedOtpr" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "prostheticsOrdered" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "correctionTrack" TEXT;
ALTER TABLE "Order" ADD COLUMN "registeredByLabel" TEXT;
ALTER TABLE "Order" ADD COLUMN "courierId" TEXT;

-- CreateIndex
CREATE INDEX "Order_courierId_idx" ON "Order"("courierId");
