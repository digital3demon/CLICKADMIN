-- Токен для QR на этикетке отгрузки (публичная страница без входа для клиента).
ALTER TABLE "Order" ADD COLUMN "stickerPublicToken" TEXT;

CREATE UNIQUE INDEX "Order_stickerPublicToken_key" ON "Order"("stickerPublicToken");
