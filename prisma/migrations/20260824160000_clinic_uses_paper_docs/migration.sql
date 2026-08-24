-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "usesPaperDocs" BOOLEAN NOT NULL DEFAULT false;

-- Клиники без ЭДО считаем бумажным документооборотом (бывш. «БЕЗ ЭДО»).
UPDATE "Clinic" SET "usesPaperDocs" = true WHERE "worksWithEdo" = false;
