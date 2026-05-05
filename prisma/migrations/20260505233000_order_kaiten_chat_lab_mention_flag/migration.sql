-- Фильтр списка заказов «упоминания»: признак @лаборатории в чате Kaiten (обновляется синком).
ALTER TABLE "Order" ADD COLUMN "kaitenChatHasLabMention" BOOLEAN NOT NULL DEFAULT false;
