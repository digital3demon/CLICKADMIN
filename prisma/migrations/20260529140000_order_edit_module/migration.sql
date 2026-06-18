-- Отдельное право на редактирование существующих нарядов.
ALTER TYPE "AppModule" ADD VALUE IF NOT EXISTS 'ORDERS_EDIT';
