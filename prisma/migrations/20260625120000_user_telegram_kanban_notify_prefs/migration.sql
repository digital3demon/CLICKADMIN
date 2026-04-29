-- Json-настройки уведомлений Telegram по канбану (поле было в schema, миграции не было).
-- ALTER без IF NOT EXISTS в SQLite; при drift колонка уже есть — см. scripts/ensure-user-telegram-phone-sqlite.cjs и prisma-migrate-deploy.cjs.
SELECT 1;
