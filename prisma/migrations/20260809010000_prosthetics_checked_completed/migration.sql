-- Степпер протетики «в пути»: Проверил / Готово
ALTER TABLE "OrderProstheticsRequest" ADD COLUMN IF NOT EXISTS "checkedAt" TIMESTAMP(3);
ALTER TABLE "OrderProstheticsRequest" ADD COLUMN IF NOT EXISTS "checkedByUserId" TEXT;
ALTER TABLE "OrderProstheticsRequest" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "OrderProstheticsRequest" ADD COLUMN IF NOT EXISTS "completedByUserId" TEXT;

ALTER TABLE "OrderChatInboxItem" ADD COLUMN IF NOT EXISTS "checkedAt" TIMESTAMP(3);
ALTER TABLE "OrderChatInboxItem" ADD COLUMN IF NOT EXISTS "checkedByUserId" TEXT;
ALTER TABLE "OrderChatInboxItem" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "OrderChatInboxItem" ADD COLUMN IF NOT EXISTS "completedByUserId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrderProstheticsRequest_checkedByUserId_fkey'
  ) THEN
    ALTER TABLE "OrderProstheticsRequest"
      ADD CONSTRAINT "OrderProstheticsRequest_checkedByUserId_fkey"
      FOREIGN KEY ("checkedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrderProstheticsRequest_completedByUserId_fkey'
  ) THEN
    ALTER TABLE "OrderProstheticsRequest"
      ADD CONSTRAINT "OrderProstheticsRequest_completedByUserId_fkey"
      FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "OrderProstheticsRequest_completedAt_idx" ON "OrderProstheticsRequest"("completedAt");
CREATE INDEX IF NOT EXISTS "OrderChatInboxItem_completedAt_idx" ON "OrderChatInboxItem"("completedAt");
