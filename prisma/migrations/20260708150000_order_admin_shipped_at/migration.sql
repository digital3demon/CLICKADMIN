-- Дата отгрузки фиксируется при смене adminShippedOtpr на true (триггер PATCH наряда).
ALTER TABLE "Order" ADD COLUMN "adminShippedAt" DATETIME;

UPDATE "Order"
SET "adminShippedAt" = "updatedAt"
WHERE "adminShippedOtpr" = 1 AND "adminShippedAt" IS NULL;
