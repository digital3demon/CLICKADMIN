-- Пометки смен в списках Заказы / ФинОтдел (не в карточку наряда / Kaiten).
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "listAdminMemo" TEXT;
