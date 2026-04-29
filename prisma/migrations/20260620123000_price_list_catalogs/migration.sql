-- Каталоги прайса: несколько списков + «активный» для нарядов.
-- Все существующие позиции переносятся в каталог «Основной» (id pl_default_seed).

CREATE TABLE "PriceList" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "PriceList" ("id", "name", "sortOrder", "createdAt", "updatedAt")
VALUES ('pl_default_seed', 'Основной', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

CREATE TABLE "PriceListWorkspaceSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activePriceListId" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PriceListWorkspaceSettings_activePriceListId_fkey" FOREIGN KEY ("activePriceListId") REFERENCES "PriceList" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PriceListWorkspaceSettings_activePriceListId_key" ON "PriceListWorkspaceSettings"("activePriceListId");

INSERT INTO "PriceListWorkspaceSettings" ("id", "activePriceListId", "updatedAt")
VALUES ('default', 'pl_default_seed', CURRENT_TIMESTAMP);

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "PriceListItem_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "priceListId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sectionTitle" TEXT,
    "subsectionTitle" TEXT,
    "priceRub" INTEGER NOT NULL,
    "leadWorkingDays" INTEGER,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PriceListItem_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "PriceListItem_new" (
    "id",
    "priceListId",
    "code",
    "name",
    "sectionTitle",
    "subsectionTitle",
    "priceRub",
    "leadWorkingDays",
    "description",
    "isActive",
    "sortOrder",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    'pl_default_seed',
    "code",
    "name",
    "sectionTitle",
    "subsectionTitle",
    "priceRub",
    "leadWorkingDays",
    "description",
    "isActive",
    "sortOrder",
    "createdAt",
    "updatedAt"
FROM "PriceListItem";

DROP TABLE "PriceListItem";
ALTER TABLE "PriceListItem_new" RENAME TO "PriceListItem";

CREATE UNIQUE INDEX "PriceListItem_priceListId_code_key" ON "PriceListItem"("priceListId", "code");
CREATE INDEX "PriceListItem_priceListId_isActive_sortOrder_idx" ON "PriceListItem"("priceListId", "isActive", "sortOrder");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
