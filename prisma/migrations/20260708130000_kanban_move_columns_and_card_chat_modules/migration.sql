-- Канбан отдельно от заказов: перемещение по колонкам и чат карточки.
ALTER TYPE "AppModule" ADD VALUE IF NOT EXISTS 'KANBAN_MOVE_COLUMNS';
ALTER TYPE "AppModule" ADD VALUE IF NOT EXISTS 'KANBAN_CARD_CHAT';
