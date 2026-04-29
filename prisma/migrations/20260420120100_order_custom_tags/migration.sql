-- Теги списка заказов (связь M:1 с Order)
CREATE TABLE "OrderCustomTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "OrderCustomTag_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "OrderCustomTag_orderId_label_key" ON "OrderCustomTag"("orderId", "label");
CREATE INDEX "OrderCustomTag_label_idx" ON "OrderCustomTag"("label");
CREATE INDEX "OrderCustomTag_orderId_idx" ON "OrderCustomTag"("orderId");
