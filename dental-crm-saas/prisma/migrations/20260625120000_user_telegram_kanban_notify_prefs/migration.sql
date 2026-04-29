-- Json-настройки уведомлений Telegram по канбану (поле было в schema, миграции не было)
ALTER TABLE "User" ADD COLUMN "telegramKanbanNotifyPrefs" TEXT;
