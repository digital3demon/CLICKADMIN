-- CreateTable
CREATE TABLE "OrderProstheticsRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "kaitenCommentId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    "resolvedByUserId" TEXT,
    "rejectedAt" DATETIME,
    "rejectedByUserId" TEXT,
    CONSTRAINT "OrderProstheticsRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderProstheticsRequest_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrderProstheticsRequest_rejectedByUserId_fkey" FOREIGN KEY ("rejectedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderProstheticsRequest_orderId_kaitenCommentId_key" ON "OrderProstheticsRequest"("orderId", "kaitenCommentId");

-- CreateIndex
CREATE INDEX "OrderProstheticsRequest_orderId_resolvedAt_idx" ON "OrderProstheticsRequest"("orderId", "resolvedAt");

-- CreateIndex
CREATE INDEX "OrderProstheticsRequest_orderId_rejectedAt_idx" ON "OrderProstheticsRequest"("orderId", "rejectedAt");
