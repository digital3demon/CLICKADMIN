-- CreateTable
CREATE TABLE "PriceListItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceRub" INTEGER NOT NULL,
    "leadWorkingDays" INTEGER,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "PriceListItem_code_key" ON "PriceListItem"("code");
CREATE INDEX "PriceListItem_isActive_sortOrder_idx" ON "PriceListItem"("isActive", "sortOrder");

-- AlterTable
ALTER TABLE "OrderConstruction" ADD COLUMN "priceListItemId" TEXT;

CREATE INDEX "OrderConstruction_priceListItemId_idx" ON "OrderConstruction"("priceListItemId");
