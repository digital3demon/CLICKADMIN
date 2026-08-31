-- CRM-канбан: таймер карточки на наряде (переживает F5, не Kaiten).
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "kanbanTimerStartedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "kanbanTimerDurationMs" INTEGER;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "kanbanTimerFrozenAt" TIMESTAMP(3);
