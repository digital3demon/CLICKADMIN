-- Чат в списках заказов, отгрузок и ФинОтдела — отдельно от редактирования наряда.
ALTER TYPE "AppModule" ADD VALUE IF NOT EXISTS 'ORDERS_CHAT';
