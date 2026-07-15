-- Журнал пометок смен в списках Заказы / ФинОтдел.
CREATE TYPE "OrderListAdminMemoAction" AS ENUM ('SET', 'CLEAR');

CREATE TABLE "OrderListAdminMemoEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "action" "OrderListAdminMemoAction" NOT NULL,
    "text" TEXT,
    "userId" TEXT,
    "authorLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderListAdminMemoEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderListAdminMemoEvent_orderId_createdAt_idx" ON "OrderListAdminMemoEvent"("orderId", "createdAt");

ALTER TABLE "OrderListAdminMemoEvent" ADD CONSTRAINT "OrderListAdminMemoEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderListAdminMemoEvent" ADD CONSTRAINT "OrderListAdminMemoEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
