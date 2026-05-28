-- Track which CRM orders were created from mail messages.
CREATE TABLE IF NOT EXISTS "EmailSourceOrder" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "emailId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EmailSourceOrder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmailSourceOrder_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "Email"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EmailSourceOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailSourceOrder_orderId_emailId_key"
ON "EmailSourceOrder"("orderId", "emailId");

CREATE INDEX IF NOT EXISTS "EmailSourceOrder_tenantId_emailId_idx"
ON "EmailSourceOrder"("tenantId", "emailId");

CREATE INDEX IF NOT EXISTS "EmailSourceOrder_tenantId_orderId_idx"
ON "EmailSourceOrder"("tenantId", "orderId");
