-- Список нарядов: tenant + архив + дата. На старте контейнера CREATE INDEX даёт окно 502.
CREATE INDEX IF NOT EXISTS "Order_tenantId_archivedAt_createdAt_idx"
ON "Order"("tenantId", "archivedAt", "createdAt");
