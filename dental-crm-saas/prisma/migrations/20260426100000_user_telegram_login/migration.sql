-- Вход через Telegram Login Widget: привязка к учётной записи User
ALTER TABLE "User" ADD COLUMN "telegramId" TEXT;
ALTER TABLE "User" ADD COLUMN "telegramUsername" TEXT;

CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
