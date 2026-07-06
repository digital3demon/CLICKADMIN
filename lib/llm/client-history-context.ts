import "server-only";
import type { PrismaClient } from "@prisma/client";

export type DoctorHistoryRow = {
  text: string;
  constructions: string;
  warnings: string;
};

export type PatientHistoryRow = {
  orderNumber: string;
  createdAt: string;
  status: string;
  constructions: string;
};

export type ClientHistoryContext = {
  doctorParticulars: string | null;
  doctorAiParticulars: string | null;
  doctorAiLessons: string | null;
  doctorHistory: DoctorHistoryRow[];
  patientHistory: PatientHistoryRow[];
};

export async function fetchDoctorHistory(
  db: PrismaClient,
  tenantId: string,
  doctorId: string,
  limit = 20,
  beforeDate?: Date | null,
): Promise<DoctorHistoryRow[]> {
  const orders = await db.order.findMany({
    where: {
      tenantId,
      doctorId,
      ...(beforeDate ? { createdAt: { lt: beforeDate } } : {}),
      clientOrderText: { not: null, notIn: [""] },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      clientOrderText: true,
      constructions: {
        select: {
          quantity: true,
          teethFdi: true,
          priceListItem: { select: { name: true } },
        },
      },
    },
  });

  return orders.map((o) => {
    const text = (o.clientOrderText ?? "").trim().replace(/\s+/g, " ");
    const cons = o.constructions
      .filter((c) => c.priceListItem?.name)
      .map((c) => {
        let s = c.priceListItem!.name;
        if (c.quantity > 1) s += ` x${c.quantity}`;
        const teeth = Array.isArray(c.teethFdi) ? c.teethFdi.filter((t) => typeof t === "string") : [];
        if (teeth.length > 0) s += ` (${teeth.join(", ")})`;
        return s;
      })
      .join("; ");
    return {
      text,
      constructions: cons || "—",
      warnings: "", // TODO: if we store warnings in DB, we could fetch them here
    };
  });
}

export async function fetchPatientHistory(
  db: PrismaClient,
  tenantId: string,
  doctorId: string,
  patientName: string | null | undefined,
  beforeDate?: Date | null,
): Promise<PatientHistoryRow[]> {
  if (!patientName || !patientName.trim()) return [];
  
  const searchName = patientName.trim();
  if (searchName.length < 3) return [];

  const orders = await db.order.findMany({
    where: {
      tenantId,
      doctorId,
      patientName: { contains: searchName, mode: "insensitive" },
      ...(beforeDate ? { createdAt: { lt: beforeDate } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      orderNumber: true,
      createdAt: true,
      status: true,
      constructions: {
        select: {
          quantity: true,
          teethFdi: true,
          priceListItem: { select: { name: true } },
        },
      },
    },
  });

  return orders.map((o) => {
    const cons = o.constructions
      .filter((c) => c.priceListItem?.name)
      .map((c) => {
        let s = c.priceListItem!.name;
        if (c.quantity > 1) s += ` x${c.quantity}`;
        const teeth = Array.isArray(c.teethFdi) ? c.teethFdi.filter((t) => typeof t === "string") : [];
        if (teeth.length > 0) s += ` (${teeth.join(", ")})`;
        return s;
      })
      .join("; ");
    
    return {
      orderNumber: o.orderNumber,
      createdAt: o.createdAt.toISOString(),
      status: o.status,
      constructions: cons || "—",
    };
  });
}

export async function fetchClientOrderHistoryContext(
  db: PrismaClient,
  tenantId: string,
  doctorId: string | null,
  patientName: string | null | undefined,
  beforeDate?: Date | null,
): Promise<ClientHistoryContext> {
  if (!doctorId) {
    return { doctorParticulars: null, doctorHistory: [], patientHistory: [] };
  }

  const doctor = await db.doctor.findUnique({
    where: { id: doctorId },
    select: { particulars: true, aiParticulars: true, aiLessons: true },
  });

  const [doctorHistory, patientHistory] = await Promise.all([
    fetchDoctorHistory(db, tenantId, doctorId, 20, beforeDate),
    fetchPatientHistory(db, tenantId, doctorId, patientName, beforeDate),
  ]);

  return {
    doctorParticulars: doctor?.particulars ?? null,
    doctorAiParticulars: doctor?.aiParticulars ?? null,
    doctorAiLessons: doctor?.aiLessons ?? null,
    doctorHistory,
    patientHistory,
  };
}
