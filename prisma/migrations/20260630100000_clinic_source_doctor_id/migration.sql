-- Связь «клиника создана как юрлицо врача-ИП» (Doctor.ipClinicAsSource ↔ Clinic.sourceDoctor).
-- Колонка была в schema.prisma без миграции — продакшен получал P2022.

ALTER TABLE "Clinic" ADD COLUMN "sourceDoctorId" TEXT;

CREATE UNIQUE INDEX "Clinic_sourceDoctorId_key" ON "Clinic"("sourceDoctorId");
