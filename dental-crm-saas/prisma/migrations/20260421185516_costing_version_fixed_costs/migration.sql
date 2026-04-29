-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CostingVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "effectiveFrom" DATETIME,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "monthlyFixedCostsRub" REAL NOT NULL DEFAULT 0,
    "fixedCostsPeriodNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_CostingVersion" ("archived", "createdAt", "effectiveFrom", "id", "title", "updatedAt") SELECT "archived", "createdAt", "effectiveFrom", "id", "title", "updatedAt" FROM "CostingVersion";
DROP TABLE "CostingVersion";
ALTER TABLE "new_CostingVersion" RENAME TO "CostingVersion";
CREATE INDEX "CostingVersion_archived_effectiveFrom_idx" ON "CostingVersion"("archived", "effectiveFrom");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
