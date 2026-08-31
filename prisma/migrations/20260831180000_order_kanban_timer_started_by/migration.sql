-- Кто поставил таймер на карточке канбана (снятие: автор или старшие).
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "kanbanTimerStartedByUserId" TEXT;
