import type { PrismaClient } from "@prisma/client";

/** Нормализует адрес из поля письма (в т.ч. «Имя <mail@…>») для списка и дедупа. */
export function normalizeOrderSourceEmailAddress(
  raw: string | null | undefined,
): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  const bracket = trimmed.match(/<([^>]+)>/);
  const candidate = (bracket?.[1] ?? trimmed).trim();
  if (!candidate.includes("@")) return null;
  return candidate.toLowerCase();
}

export function mergeDistinctOrderSourceEmails(
  addresses: Array<string | null | undefined>,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of addresses) {
    const normalized = normalizeOrderSourceEmailAddress(raw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out.sort((a, b) => a.localeCompare(b, "ru"));
}

async function listOrderSourceEmailsForOrders(
  db: PrismaClient,
  tenantId: string,
  orderWhere: { clinicId: string } | { doctorId: string },
): Promise<string[]> {
  const links = await db.emailSourceOrder.findMany({
    where: {
      tenantId,
      order: orderWhere,
    },
    distinct: ["emailId"],
    select: {
      email: { select: { fromAddress: true } },
    },
  });
  return mergeDistinctOrderSourceEmails(
    links.map((link) => link.email.fromAddress),
  );
}

export async function listClinicOrderSourceEmails(
  db: PrismaClient,
  tenantId: string,
  clinicId: string,
): Promise<string[]> {
  return listOrderSourceEmailsForOrders(db, tenantId, { clinicId });
}

export async function listDoctorOrderSourceEmails(
  db: PrismaClient,
  tenantId: string,
  doctorId: string,
): Promise<string[]> {
  return listOrderSourceEmailsForOrders(db, tenantId, { doctorId });
}
