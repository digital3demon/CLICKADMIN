-- Separate permission for creating new orders.
ALTER TYPE "AppModule" ADD VALUE IF NOT EXISTS 'ORDERS_CREATE';
