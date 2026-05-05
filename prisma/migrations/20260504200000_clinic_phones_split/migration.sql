-- Дополнительные телефоны клиники (бухгалтерия, руководство).
ALTER TABLE "Clinic" ADD COLUMN "phoneAccounting" TEXT;
ALTER TABLE "Clinic" ADD COLUMN "phoneManagement" TEXT;
