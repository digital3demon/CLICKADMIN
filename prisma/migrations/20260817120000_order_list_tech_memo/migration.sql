-- Пометки техники (ПТ) в списках Заказы / ФинОтдел.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "listTechMemo" TEXT;

CREATE TABLE IF NOT EXISTS "OrderListTechMemoEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "action" "OrderListAdminMemoAction" NOT NULL,
    "text" TEXT,
    "userId" TEXT,
    "authorLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderListTechMemoEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OrderListTechMemoEvent_orderId_createdAt_idx" ON "OrderListTechMemoEvent"("orderId", "createdAt");

ALTER TABLE "OrderListTechMemoEvent" DROP CONSTRAINT IF EXISTS "OrderListTechMemoEvent_orderId_fkey";
ALTER TABLE "OrderListTechMemoEvent" ADD CONSTRAINT "OrderListTechMemoEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderListTechMemoEvent" DROP CONSTRAINT IF EXISTS "OrderListTechMemoEvent_userId_fkey";
ALTER TABLE "OrderListTechMemoEvent" ADD CONSTRAINT "OrderListTechMemoEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
