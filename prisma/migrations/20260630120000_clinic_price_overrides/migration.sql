-- CreateTable
CREATE TABLE "ClinicPriceOverride" (
    "clinicId" TEXT NOT NULL,
    "priceListItemId" TEXT NOT NULL,
    "priceRub" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClinicPriceOverride_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClinicPriceOverride_priceListItemId_fkey" FOREIGN KEY ("priceListItemId") REFERENCES "PriceListItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClinicPriceOverride_pkey" PRIMARY KEY ("clinicId", "priceListItemId")
);

-- CreateIndex
CREATE INDEX "ClinicPriceOverride_clinicId_idx" ON "ClinicPriceOverride"("clinicId");

-- CreateIndex
CREATE INDEX "ClinicPriceOverride_priceListItemId_idx" ON "ClinicPriceOverride"("priceListItemId");
