-- Снимок этапного таймера при переносе вперёд (восстановление за 45 мин).
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "kanbanTimerParkedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "kanbanTimerParkedRemainingMs" INTEGER;
