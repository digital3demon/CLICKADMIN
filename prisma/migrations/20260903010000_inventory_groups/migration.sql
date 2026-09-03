-- CreateEnum
CREATE TYPE "InventoryGroupOwnerKind" AS ENUM ('WAREHOUSE', 'MANUFACTURER');

-- CreateTable
CREATE TABLE "InventoryGroup" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "ownerKind" "InventoryGroupOwnerKind" NOT NULL,
    "ownerKey" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryGroupManufacturer" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "manufacturerKey" TEXT NOT NULL,
    "manufacturerName" TEXT NOT NULL,

    CONSTRAINT "InventoryGroupManufacturer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryGroupItem" (
    "groupId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "InventoryGroupItem_pkey" PRIMARY KEY ("groupId","itemId")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryGroup_warehouseId_ownerKind_ownerKey_name_key" ON "InventoryGroup"("warehouseId", "ownerKind", "ownerKey", "name");

-- CreateIndex
CREATE INDEX "InventoryGroup_warehouseId_ownerKind_ownerKey_idx" ON "InventoryGroup"("warehouseId", "ownerKind", "ownerKey");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryGroupManufacturer_groupId_manufacturerKey_key" ON "InventoryGroupManufacturer"("groupId", "manufacturerKey");

-- CreateIndex
CREATE INDEX "InventoryGroupManufacturer_warehouseId_manufacturerKey_idx" ON "InventoryGroupManufacturer"("warehouseId", "manufacturerKey");

-- CreateIndex
CREATE INDEX "InventoryGroupItem_itemId_idx" ON "InventoryGroupItem"("itemId");

-- AddForeignKey
ALTER TABLE "InventoryGroup" ADD CONSTRAINT "InventoryGroup_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryGroupManufacturer" ADD CONSTRAINT "InventoryGroupManufacturer_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "InventoryGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryGroupItem" ADD CONSTRAINT "InventoryGroupItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "InventoryGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryGroupItem" ADD CONSTRAINT "InventoryGroupItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
