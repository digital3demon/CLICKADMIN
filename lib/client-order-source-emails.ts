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

export type OrderSourceEmailClientMatch = {
  clinicId: string | null;
  doctorId: string | null;
  /** true — однозначное совпадение fromAddress со справочником почт клиентов */
  matched: boolean;
  /** true — несколько разных пар clinic/doctor на одну почту */
  ambiguous: boolean;
};

/** Обратный lookup: fromAddress письма → clinicId/doctorId из истории EmailSourceOrder. */
export async function resolveClientIdsFromOrderSourceEmail(
  db: PrismaClient,
  tenantId: string,
  fromAddress: string | null | undefined,
): Promise<OrderSourceEmailClientMatch> {
  const normalized = normalizeOrderSourceEmailAddress(fromAddress);
  if (!normalized) {
    return { clinicId: null, doctorId: null, matched: false, ambiguous: false };
  }

  const links = await db.emailSourceOrder.findMany({
    where: { tenantId },
    select: {
      email: { select: { fromAddress: true } },
      order: { select: { clinicId: true, doctorId: true } },
    },
  });

  const pairKeys = new Set<string>();
  let clinicId: string | null = null;
  let doctorId: string | null = null;

  for (const link of links) {
    const addr = normalizeOrderSourceEmailAddress(link.email.fromAddress);
    if (addr !== normalized) continue;
    const key = `${link.order.clinicId ?? ""}:${link.order.doctorId}`;
    if (pairKeys.has(key)) continue;
    pairKeys.add(key);
    if (pairKeys.size === 1) {
      clinicId = link.order.clinicId;
      doctorId = link.order.doctorId;
    }
  }

  if (pairKeys.size === 0) {
    return { clinicId: null, doctorId: null, matched: false, ambiguous: false };
  }
  if (pairKeys.size > 1) {
    return { clinicId: null, doctorId: null, matched: false, ambiguous: true };
  }
  return { clinicId, doctorId, matched: true, ambiguous: false };
}

/** Для тестов и offline-разбора: группировка адресов → пары клиентов. */
export function buildOrderSourceEmailPairIndex(
  rows: Array<{
    fromAddress: string | null | undefined;
    clinicId: string | null;
    doctorId: string;
  }>,
): Map<string, Array<{ clinicId: string | null; doctorId: string }>> {
  const index = new Map<string, Array<{ clinicId: string | null; doctorId: string }>>();
  for (const row of rows) {
    const addr = normalizeOrderSourceEmailAddress(row.fromAddress);
    if (!addr) continue;
    const list = index.get(addr) ?? [];
    const key = `${row.clinicId ?? ""}:${row.doctorId}`;
    if (!list.some((x) => `${x.clinicId ?? ""}:${x.doctorId}` === key)) {
      list.push({ clinicId: row.clinicId, doctorId: row.doctorId });
    }
    index.set(addr, list);
  }
  return index;
}

export function resolveClientIdsFromPairIndex(
  index: Map<string, Array<{ clinicId: string | null; doctorId: string }>>,
  fromAddress: string | null | undefined,
): OrderSourceEmailClientMatch {
  const normalized = normalizeOrderSourceEmailAddress(fromAddress);
  if (!normalized) {
    return { clinicId: null, doctorId: null, matched: false, ambiguous: false };
  }
  const pairs = index.get(normalized) ?? [];
  if (pairs.length === 0) {
    return { clinicId: null, doctorId: null, matched: false, ambiguous: false };
  }
  if (pairs.length > 1) {
    return { clinicId: null, doctorId: null, matched: false, ambiguous: true };
  }
  return {
    clinicId: pairs[0]!.clinicId,
    doctorId: pairs[0]!.doctorId,
    matched: true,
    ambiguous: false,
  };
}
