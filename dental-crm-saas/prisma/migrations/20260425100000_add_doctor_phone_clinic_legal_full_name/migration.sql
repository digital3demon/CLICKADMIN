-- Поля из schema.prisma, которые не были добавлены из-за заглушки
-- 20260404213000_clinic_requisites (там был только SELECT 1).

ALTER TABLE "Doctor" ADD COLUMN "phone" TEXT;
ALTER TABLE "Clinic" ADD COLUMN "legalFullName" TEXT;
