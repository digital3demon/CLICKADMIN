-- Откат колонки канбана при снятии «Работа отправлена».
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "kanbanColumnBeforeShipped" TEXT;
