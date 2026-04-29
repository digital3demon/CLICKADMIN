-- CreateTable
CREATE TABLE "CostingSharedPool" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "versionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "totalRub" REAL NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CostingSharedPool_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CostingVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CostingLinePoolShare" (
    "lineId" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "shareRub" REAL NOT NULL DEFAULT 0,

    PRIMARY KEY ("lineId", "poolId"),
    CONSTRAINT "CostingLinePoolShare_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "CostingSharedPool" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CostingLinePoolShare_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "CostingLine" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CostingSharedPool_versionId_sortOrder_idx" ON "CostingSharedPool"("versionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CostingSharedPool_versionId_key_key" ON "CostingSharedPool"("versionId", "key");

-- CreateIndex
CREATE INDEX "CostingLinePoolShare_poolId_idx" ON "CostingLinePoolShare"("poolId");
