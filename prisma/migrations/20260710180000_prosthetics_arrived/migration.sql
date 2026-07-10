-- «Пришла» для заявок протетики (после accept / «в пути»)
ALTER TABLE "OrderProstheticsRequest" ADD COLUMN IF NOT EXISTS "arrivedAt" TIMESTAMP(3);
ALTER TABLE "OrderProstheticsRequest" ADD COLUMN IF NOT EXISTS "arrivedByUserId" TEXT;

ALTER TABLE "OrderChatInboxItem" ADD COLUMN IF NOT EXISTS "arrivedAt" TIMESTAMP(3);
ALTER TABLE "OrderChatInboxItem" ADD COLUMN IF NOT EXISTS "arrivedByUserId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrderProstheticsRequest_arrivedByUserId_fkey'
  ) THEN
    ALTER TABLE "OrderProstheticsRequest"
      ADD CONSTRAINT "OrderProstheticsRequest_arrivedByUserId_fkey"
      FOREIGN KEY ("arrivedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "OrderProstheticsRequest_arrivedAt_idx" ON "OrderProstheticsRequest"("arrivedAt");
