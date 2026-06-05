-- PDF-шаблон (primary) + DOCX optional; у клиники — доп. колонки для docx-копии

ALTER TABLE "ContractTemplateSettings" ADD COLUMN IF NOT EXISTS "pdfFileName" TEXT;
ALTER TABLE "ContractTemplateSettings" ADD COLUMN IF NOT EXISTS "pdfBytes" BYTEA;
ALTER TABLE "ContractTemplateSettings" ADD COLUMN IF NOT EXISTS "docxFileName" TEXT;

UPDATE "ContractTemplateSettings"
SET "docxFileName" = COALESCE("docxFileName", "fileName")
WHERE "docxFileName" IS NULL AND "fileName" IS NOT NULL;

ALTER TABLE "ClinicContractDoc" ADD COLUMN IF NOT EXISTS "docxFileName" TEXT;
ALTER TABLE "ClinicContractDoc" ADD COLUMN IF NOT EXISTS "docxMimeType" TEXT;
ALTER TABLE "ClinicContractDoc" ADD COLUMN IF NOT EXISTS "docxData" BYTEA;
