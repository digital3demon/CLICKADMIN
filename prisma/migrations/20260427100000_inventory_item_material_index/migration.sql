-- Improve lookups by material link in inventory bootstrap and sync flows.
CREATE INDEX "InventoryItem_materialId_idx" ON "InventoryItem"("materialId");
