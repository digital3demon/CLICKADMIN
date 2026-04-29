-- Профиль: пресет аватара и ник для будущих @-уведомлений в Telegram
ALTER TABLE "User" ADD COLUMN "avatarPresetId" TEXT;
ALTER TABLE "User" ADD COLUMN "mentionHandle" TEXT;

CREATE UNIQUE INDEX "User_mentionHandle_key" ON "User"("mentionHandle");
