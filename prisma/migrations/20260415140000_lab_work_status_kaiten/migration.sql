-- Старый этап «Отправлена» → «Сдана админам»
UPDATE "Order" SET "labWorkStatus" = 'TO_ADMINS' WHERE "labWorkStatus" = 'SENT';
