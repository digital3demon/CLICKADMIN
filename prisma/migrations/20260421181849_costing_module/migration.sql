-- CreateTable
CREATE TABLE "CostingVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "effectiveFrom" DATETIME,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CostingColumn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "versionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "formula" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "hint" TEXT,
    CONSTRAINT "CostingColumn_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CostingVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CostingLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "versionId" TEXT NOT NULL,
    "priceListItemId" TEXT,
    "inputsJson" JSONB NOT NULL DEFAULT '{}',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CostingLine_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CostingVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CostingLine_priceListItemId_fkey" FOREIGN KEY ("priceListItemId") REFERENCES "PriceListItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CostingClientProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "versionId" TEXT NOT NULL,
    "clinicId" TEXT,
    "name" TEXT NOT NULL,
    "listDiscountPercent" REAL NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CostingClientProfile_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CostingVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CostingClientProfile_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CostingVersion_archived_effectiveFrom_idx" ON "CostingVersion"("archived", "effectiveFrom");

-- CreateIndex
CREATE INDEX "CostingColumn_versionId_sortOrder_idx" ON "CostingColumn"("versionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CostingColumn_versionId_key_key" ON "CostingColumn"("versionId", "key");

-- CreateIndex
CREATE INDEX "CostingLine_versionId_idx" ON "CostingLine"("versionId");

-- CreateIndex
CREATE INDEX "CostingLine_priceListItemId_idx" ON "CostingLine"("priceListItemId");

-- CreateIndex
CREATE INDEX "CostingClientProfile_versionId_idx" ON "CostingClientProfile"("versionId");

-- CreateIndex
CREATE INDEX "CostingClientProfile_clinicId_idx" ON "CostingClientProfile"("clinicId");
