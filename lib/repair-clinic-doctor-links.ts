import type { PrismaClient } from "@prisma/client";

/**
 * Восстанавливает DoctorOnClinic по нарядам с этой клиникой (order.clinicId + doctorId).
 * Один врач может быть в нескольких клиниках и одновременно вести частную практику
 * (наряды с clinicId = null) — сюда попадают только наряды, явно привязанные к клинике.
 *
 * Для каждой пары врач–клиника — upsert (SQLite в Prisma не даёт skipDuplicates на этой связи).
 */
export async function repairDoctorLinksFromOrders(
  db: PrismaClient,
  clinicId: string,
): Promise<number> {
  const orders = await db.order.findMany({
    where: { clinicId },
    select: { doctorId: true },
  });
  if (orders.length === 0) return 0;

  const doctorIds = [
    ...new Set(
      orders
        .map((o) => o.doctorId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
  if (doctorIds.length === 0) return 0;

  const suppressed = await db.doctorClinicLinkSuppression.findMany({
    where: { clinicId, doctorId: { in: doctorIds } },
    select: { doctorId: true },
  });
  const suppressedSet = new Set(suppressed.map((s) => s.doctorId));

  for (const doctorId of doctorIds) {
    if (suppressedSet.has(doctorId)) continue;
    await db.doctorOnClinic.upsert({
      where: {
        doctorId_clinicId: { doctorId, clinicId },
      },
      create: { doctorId, clinicId },
      update: {},
    });
  }
  return doctorIds.length;
}

/**
 * Восстанавливает DoctorOnClinic по нарядам этого врача (order.doctorId + clinicId).
 * Симметрично repairDoctorLinksFromOrders для карточки врача.
 */
export async function repairClinicLinksFromOrdersForDoctor(
  db: PrismaClient,
  doctorId: string,
): Promise<number> {
  const orders = await db.order.findMany({
    where: { doctorId, clinicId: { not: null } },
    select: { clinicId: true },
  });
  if (orders.length === 0) return 0;

  const clinicIds = [
    ...new Set(
      orders
        .map((o) => o.clinicId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
  if (clinicIds.length === 0) return 0;

  const suppressed = await db.doctorClinicLinkSuppression.findMany({
    where: { doctorId, clinicId: { in: clinicIds } },
    select: { clinicId: true },
  });
  const suppressedSet = new Set(suppressed.map((s) => s.clinicId));

  for (const clinicId of clinicIds) {
    if (suppressedSet.has(clinicId)) continue;
    await db.doctorOnClinic.upsert({
      where: {
        doctorId_clinicId: { doctorId, clinicId },
      },
      create: { doctorId, clinicId },
      update: {},
    });
  }
  return clinicIds.length;
}
