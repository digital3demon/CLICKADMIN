-- Дата отгрузки фиксируется при смене adminShippedOtpr на true (триггер PATCH наряда).
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "adminShippedAt" TIMESTAMP(3);

UPDATE "Order"
SET "adminShippedAt" = "updatedAt"
WHERE "adminShippedOtpr" = true AND "adminShippedAt" IS NULL;
