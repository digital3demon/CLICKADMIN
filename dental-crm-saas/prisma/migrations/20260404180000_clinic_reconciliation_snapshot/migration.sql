-- CreateTable
CREATE TABLE "ClinicReconciliationSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "periodFromStr" TEXT NOT NULL,
    "periodToStr" TEXT NOT NULL,
    "periodLabelRu" TEXT NOT NULL,
    "legalEntityLabel" TEXT NOT NULL,
    "xlsxBytes" BLOB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissedAt" DATETIME,
    CONSTRAINT "ClinicReconciliationSnapshot_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ClinicReconciliationSnapshot_clinicId_slot_periodFromStr_periodToStr_key" ON "ClinicReconciliationSnapshot"("clinicId", "slot", "periodFromStr", "periodToStr");

CREATE INDEX "ClinicReconciliationSnapshot_clinicId_createdAt_idx" ON "ClinicReconciliationSnapshot"("clinicId", "createdAt");

CREATE INDEX "ClinicReconciliationSnapshot_dismissedAt_idx" ON "ClinicReconciliationSnapshot"("dismissedAt");
