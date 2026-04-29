import type { PrismaClient } from "@prisma/client";

/**
 * Создаёт или активирует клинику-зеркало для врача-ИП и связь DoctorOnClinic.
 */
export async function ensureDoctorIpClinic(
  prisma: PrismaClient,
  doctorId: string,
): Promise<{ clinicId: string }> {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { id: true, tenantId: true, fullName: true, deletedAt: true },
  });
  if (!doctor || doctor.deletedAt) {
    throw new Error("Врач не найден или удалён");
  }

  const existing = await prisma.clinic.findFirst({
    where: { sourceDoctorId: doctorId },
    select: { id: true, isActive: true },
  });
  if (existing) {
    if (!existing.isActive) {
      await prisma.clinic.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
    }
    await prisma.doctorOnClinic.upsert({
      where: {
        doctorId_clinicId: { doctorId, clinicId: existing.id },
      },
      create: { doctorId, clinicId: existing.id },
      update: {},
    });
    return { clinicId: existing.id };
  }

  const name = `ИП ${doctor.fullName}`.trim().slice(0, 240);
  const c = await prisma.clinic.create({
    data: {
      tenantId: doctor.tenantId,
      name: name || "ИП (врач)",
      sourceDoctorId: doctorId,
      billingLegalForm: "IP",
      isActive: true,
    },
  });
  await prisma.doctorOnClinic.create({
    data: { doctorId, clinicId: c.id },
  });
  return { clinicId: c.id };
}

/** Снимаем галочку ИП: клиника в списке остаётся, но неактивна (история нарядов). */
export async function deactivateDoctorIpClinic(
  prisma: PrismaClient,
  doctorId: string,
): Promise<void> {
  const c = await prisma.clinic.findFirst({
    where: { sourceDoctorId: doctorId },
    select: { id: true },
  });
  if (!c) return;
  await prisma.clinic.update({
    where: { id: c.id },
    data: { isActive: false },
  });
}
