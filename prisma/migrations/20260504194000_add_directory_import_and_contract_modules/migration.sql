-- Add separate access switches for:
-- 1) Orders import/export page
-- 2) Contract template page
ALTER TYPE "AppModule" ADD VALUE IF NOT EXISTS 'CONFIG_ORDERS_IMPORT_EXPORT';
ALTER TYPE "AppModule" ADD VALUE IF NOT EXISTS 'CONFIG_CONTRACT_TEMPLATE';
