-- Степпер: Подтвердил (resolvedAt) → Заказал (orderedAt) → Пришла → Проверил → Готово
ALTER TABLE "OrderProstheticsRequest" ADD COLUMN IF NOT EXISTS "orderedAt" TIMESTAMP(3);
ALTER TABLE "OrderProstheticsRequest" ADD COLUMN IF NOT EXISTS "orderedByUserId" TEXT;

ALTER TABLE "OrderChatInboxItem" ADD COLUMN IF NOT EXISTS "orderedAt" TIMESTAMP(3);
ALTER TABLE "OrderChatInboxItem" ADD COLUMN IF NOT EXISTS "orderedByUserId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrderProstheticsRequest_orderedByUserId_fkey'
  ) THEN
    ALTER TABLE "OrderProstheticsRequest"
      ADD CONSTRAINT "OrderProstheticsRequest_orderedByUserId_fkey"
      FOREIGN KEY ("orderedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Уже принятые «в пути» считались заказанными — не заставляем кликать «Заказал» снова
UPDATE "OrderProstheticsRequest"
SET "orderedAt" = "resolvedAt",
    "orderedByUserId" = "resolvedByUserId"
WHERE "resolvedAt" IS NOT NULL
  AND "orderedAt" IS NULL;

UPDATE "OrderChatInboxItem"
SET "orderedAt" = "resolvedAt",
    "orderedByUserId" = "resolvedByUserId"
WHERE "type" = 'PROSTHETICS'
  AND "resolvedAt" IS NOT NULL
  AND "orderedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "OrderProstheticsRequest_orderedAt_idx" ON "OrderProstheticsRequest"("orderedAt");
