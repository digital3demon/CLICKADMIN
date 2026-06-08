-- Ручная шапка Kaiten: не перезаписывать title/description из CRM, пока флаг не сброшен.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "kaitenCardTitleManual" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "kaitenCardDescriptionManual" BOOLEAN NOT NULL DEFAULT false;
