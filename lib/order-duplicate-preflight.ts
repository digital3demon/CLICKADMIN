import type { PrismaClient } from "@prisma/client";

/** Ключ для сравнения ФИО пациента при поиске дубликатов. */
export function normalizePatientKeyForDuplicate(patientName: string): string {
  return patientName.trim().replace(/\s+/g, " ").toLowerCase();
}

export type DuplicatePreflightMatch = {
  id: string;
  orderNumber: string;
  createdAt: string;
};

export type DuplicatePreflightResult =
  | { kind: "none" }
  | { kind: "open_duplicate"; matches: DuplicatePreflightMatch[] }
  | { kind: "shipped_only"; suggestedParent: DuplicatePreflightMatch };

export async function duplicatePreflightForNewOrder(
  prisma: PrismaClient,
  params: {
    doctorId: string;
    /** Уже с учётом ИП-врача (см. `resolveClinicIdForDoctorIpOrder` на API). */
    clinicId: string | null;
    patientName: string;
  },
): Promise<DuplicatePreflightResult> {
  const key = normalizePatientKeyForDuplicate(params.patientName);
  if (!key) return { kind: "none" };

  const rows = await prisma.order.findMany({
    where: {
      archivedAt: null,
      doctorId: params.doctorId,
      clinicId: params.clinicId,
    },
    select: {
      id: true,
      orderNumber: true,
      patientName: true,
      adminShippedOtpr: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const matches = rows.filter(
    (r) => normalizePatientKeyForDuplicate(r.patientName ?? "") === key,
  );
  if (matches.length === 0) return { kind: "none" };

  const open = matches.filter((m) => !m.adminShippedOtpr);
  if (open.length > 0) {
    return {
      kind: "open_duplicate",
      matches: open.map((m) => ({
        id: m.id,
        orderNumber: m.orderNumber,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  const first = matches[0]!;
  return {
    kind: "shipped_only",
    suggestedParent: {
      id: first.id,
      orderNumber: first.orderNumber,
      createdAt: first.createdAt.toISOString(),
    },
  };
}
