-- Общий Telegram для админов организации (не пользователь CRM)
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "adminSharedTelegramChatId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "adminSharedTelegramUsername" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "adminSharedMessengerNotifyPrefs" JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_adminSharedTelegramChatId_key" ON "Tenant"("adminSharedTelegramChatId");
