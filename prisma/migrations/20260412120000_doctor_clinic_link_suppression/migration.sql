-- CreateTable
CREATE TABLE "DoctorClinicLinkSuppression" (
    "doctorId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DoctorClinicLinkSuppression_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DoctorClinicLinkSuppression_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DoctorClinicLinkSuppression_pkey" PRIMARY KEY ("doctorId","clinicId")
);

-- CreateIndex
CREATE INDEX "DoctorClinicLinkSuppression_clinicId_idx" ON "DoctorClinicLinkSuppression"("clinicId");
