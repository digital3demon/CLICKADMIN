-- Договоры клиники: хранение docx в БД и отдельная нумерация YYMM-NNN.

CREATE TABLE "ContractNumberSettings" (
    "id" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractNumberSettings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ContractNumberSettings"
ADD CONSTRAINT "ContractNumberSettings_id_fkey"
FOREIGN KEY ("id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ClinicContractDoc" (
    "clinicId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicContractDoc_pkey" PRIMARY KEY ("clinicId")
);

ALTER TABLE "ClinicContractDoc"
ADD CONSTRAINT "ClinicContractDoc_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
