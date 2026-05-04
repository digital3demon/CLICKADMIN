-- Пер-тенант настройки шаблона договора (.docx) для автозамены red-quoted полей.

CREATE TABLE "ContractTemplateSettings" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "docxBytes" BYTEA NOT NULL,
    "placeholders" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractTemplateSettings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ContractTemplateSettings"
ADD CONSTRAINT "ContractTemplateSettings_id_fkey"
FOREIGN KEY ("id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
