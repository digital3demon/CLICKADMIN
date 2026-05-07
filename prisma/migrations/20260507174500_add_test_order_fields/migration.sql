ALTER TABLE "Order"
ADD COLUMN "isTestOrder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "testOrderOwnerUserId" TEXT;

ALTER TABLE "Order"
ADD CONSTRAINT "Order_testOrderOwnerUserId_fkey"
FOREIGN KEY ("testOrderOwnerUserId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "Order_tenantId_isTestOrder_testOrderOwnerUserId_idx"
ON "Order"("tenantId", "isTestOrder", "testOrderOwnerUserId");
