-- Индивидуальные цены прайса: уровень врача и связка врач+клиника.

CREATE TABLE "DoctorPriceOverride" (
    "doctorId" TEXT NOT NULL,
    "priceListItemId" TEXT NOT NULL,
    "priceRub" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorPriceOverride_pkey" PRIMARY KEY ("doctorId","priceListItemId")
);

ALTER TABLE "DoctorPriceOverride"
ADD CONSTRAINT "DoctorPriceOverride_doctorId_fkey"
FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DoctorPriceOverride"
ADD CONSTRAINT "DoctorPriceOverride_priceListItemId_fkey"
FOREIGN KEY ("priceListItemId") REFERENCES "PriceListItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "DoctorPriceOverride_priceListItemId_idx"
ON "DoctorPriceOverride"("priceListItemId");

CREATE TABLE "DoctorClinicPriceOverride" (
    "doctorId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "priceListItemId" TEXT NOT NULL,
    "priceRub" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorClinicPriceOverride_pkey" PRIMARY KEY ("doctorId","clinicId","priceListItemId")
);

ALTER TABLE "DoctorClinicPriceOverride"
ADD CONSTRAINT "DoctorClinicPriceOverride_doctorId_fkey"
FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DoctorClinicPriceOverride"
ADD CONSTRAINT "DoctorClinicPriceOverride_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DoctorClinicPriceOverride"
ADD CONSTRAINT "DoctorClinicPriceOverride_priceListItemId_fkey"
FOREIGN KEY ("priceListItemId") REFERENCES "PriceListItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "DoctorClinicPriceOverride_clinicId_doctorId_idx"
ON "DoctorClinicPriceOverride"("clinicId","doctorId");

CREATE INDEX "DoctorClinicPriceOverride_priceListItemId_idx"
ON "DoctorClinicPriceOverride"("priceListItemId");
