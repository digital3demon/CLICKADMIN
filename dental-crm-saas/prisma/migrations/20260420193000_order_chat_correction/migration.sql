-- CreateTable
CREATE TABLE "OrderChatCorrection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    "resolvedByUserId" TEXT,
    CONSTRAINT "OrderChatCorrection_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderChatCorrection_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "OrderChatCorrection_orderId_resolvedAt_idx" ON "OrderChatCorrection"("orderId", "resolvedAt");

-- CreateIndex
CREATE INDEX "OrderChatCorrection_orderId_createdAt_idx" ON "OrderChatCorrection"("orderId", "createdAt");
