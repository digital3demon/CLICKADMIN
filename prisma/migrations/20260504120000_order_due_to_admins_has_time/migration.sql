-- Дата записи «в течение дня» (флаг отдельно от календарного времени по умолчанию).
ALTER TABLE "Order" ADD COLUMN "dueToAdminsHasTime" BOOLEAN NOT NULL DEFAULT true;
