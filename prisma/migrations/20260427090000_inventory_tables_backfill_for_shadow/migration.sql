-- Backfill inventory tables for environments where they were introduced via db push.
-- Needed so full migration replay (shadow DB) succeeds before index migrations.

CREATE TABLE IF NOT EXISTS "Warehouse" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "InventoryItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sku" TEXT,
  "name" TEXT NOT NULL,
  "unit" TEXT NOT NULL DEFAULT 'шт',
  "materialId" TEXT,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "InventoryItem_materialId_fkey"
    FOREIGN KEY ("materialId") REFERENCES "Material" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_sku_key"
  ON "InventoryItem"("sku");
CREATE INDEX IF NOT EXISTS "InventoryItem_isActive_sortOrder_idx"
  ON "InventoryItem"("isActive", "sortOrder");
CREATE INDEX IF NOT EXISTS "InventoryItem_name_idx"
  ON "InventoryItem"("name");

CREATE TABLE IF NOT EXISTS "StockBalance" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "itemId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "quantityOnHand" REAL NOT NULL DEFAULT 0,
  "averageUnitCostRub" REAL,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "StockBalance_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "InventoryItem" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StockBalance_warehouseId_fkey"
    FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "StockBalance_itemId_warehouseId_key"
  ON "StockBalance"("itemId", "warehouseId");

CREATE TABLE IF NOT EXISTS "StockMovement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "kind" TEXT NOT NULL,
  "quantity" REAL NOT NULL,
  "totalCostRub" REAL,
  "note" TEXT,
  "itemId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "orderId" TEXT,
  "actorLabel" TEXT NOT NULL DEFAULT 'Пользователь',
  "idempotencyKey" TEXT,
  CONSTRAINT "StockMovement_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "InventoryItem" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StockMovement_warehouseId_fkey"
    FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StockMovement_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "StockMovement_idempotencyKey_key"
  ON "StockMovement"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "StockMovement_itemId_createdAt_idx"
  ON "StockMovement"("itemId", "createdAt");
CREATE INDEX IF NOT EXISTS "StockMovement_warehouseId_createdAt_idx"
  ON "StockMovement"("warehouseId", "createdAt");
CREATE INDEX IF NOT EXISTS "StockMovement_orderId_idx"
  ON "StockMovement"("orderId");
