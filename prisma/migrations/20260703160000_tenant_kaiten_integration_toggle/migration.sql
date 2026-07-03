-- Tenant-level переключатель интеграции с Kaiten (по умолчанию включена для обратной совместимости).
ALTER TABLE "Tenant" ADD COLUMN "kaitenIntegrationEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Tenant" ADD COLUMN "kaitenIntegrationDisabledAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "kaitenIntegrationDisabledByUserId" TEXT;

ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_kaitenIntegrationDisabledByUserId_fkey"
  FOREIGN KEY ("kaitenIntegrationDisabledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
