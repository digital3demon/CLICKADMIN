-- AlterTable
ALTER TABLE "CostingVersion" ADD COLUMN "expectedWorksPerMonth" REAL;

-- CreateTable
CREATE TABLE "CostingFixedCostItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "versionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amountRub" REAL NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CostingFixedCostItem_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CostingVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CostingFixedCostItem_versionId_sortOrder_idx" ON "CostingFixedCostItem"("versionId", "sortOrder");
