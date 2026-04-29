-- Тип склада; позиции привязаны к складу; убрана связь с Material.
ALTER TABLE "Warehouse" ADD COLUMN "warehouseType" TEXT;

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

DROP INDEX IF EXISTS "InventoryItem_sku_key";
DROP INDEX IF EXISTS "InventoryItem_materialId_idx";

CREATE TABLE "new_InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "warehouseId" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'шт',
    "manufacturer" TEXT,
    "unitsPerSupply" REAL,
    "referenceUnitPriceRub" REAL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InventoryItem_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_InventoryItem" (
    "id",
    "warehouseId",
    "sku",
    "name",
    "unit",
    "manufacturer",
    "unitsPerSupply",
    "referenceUnitPriceRub",
    "notes",
    "isActive",
    "sortOrder",
    "createdAt",
    "updatedAt"
)
SELECT
    i."id",
    COALESCE(
        (
            SELECT b."warehouseId"
            FROM "StockBalance" b
            WHERE b."itemId" = i."id"
            ORDER BY ABS(b."quantityOnHand") DESC, b."warehouseId"
            LIMIT 1
        ),
        (SELECT w."id" FROM "Warehouse" w WHERE w."isDefault" = 1 ORDER BY w."createdAt" ASC LIMIT 1),
        (SELECT w."id" FROM "Warehouse" w ORDER BY w."createdAt" ASC LIMIT 1)
    ),
    i."sku",
    i."name",
    i."unit",
    NULL,
    NULL,
    NULL,
    i."notes",
    i."isActive",
    i."sortOrder",
    i."createdAt",
    i."updatedAt"
FROM "InventoryItem" AS i;

DROP TABLE "InventoryItem";
ALTER TABLE "new_InventoryItem" RENAME TO "InventoryItem";

CREATE INDEX "InventoryItem_warehouseId_idx" ON "InventoryItem"("warehouseId");
CREATE INDEX "InventoryItem_isActive_sortOrder_idx" ON "InventoryItem"("isActive", "sortOrder");
CREATE INDEX "InventoryItem_name_idx" ON "InventoryItem"("name");
CREATE UNIQUE INDEX "InventoryItem_warehouseId_sku_key" ON "InventoryItem"("warehouseId", "sku");

-- Остатки только по складу позиции (если раньше были «чужие» строки)
DELETE FROM "StockBalance"
WHERE "id" IN (
    SELECT b."id"
    FROM "StockBalance" b
    INNER JOIN "InventoryItem" i ON i."id" = b."itemId"
    WHERE b."warehouseId" != i."warehouseId"
);

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
