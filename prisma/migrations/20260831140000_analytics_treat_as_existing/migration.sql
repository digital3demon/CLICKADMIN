-- Пометка «не новый»: врач/клиника были раньше, чем заведены в CRM.
ALTER TABLE "Doctor" ADD COLUMN IF NOT EXISTS "analyticsTreatAsExisting" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "analyticsTreatAsExisting" BOOLEAN NOT NULL DEFAULT false;
