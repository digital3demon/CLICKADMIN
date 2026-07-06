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

async function resolveClientIdsFromClientCatalog(
  tenantId: string,
  normalizedEmail: string,
): Promise<OrderSourceEmailClientMatch> {
  const { getClientsPrisma } = await import("@/lib/get-domain-prisma");
  const clientsPrisma = await getClientsPrisma();
  const doctors = await clientsPrisma.doctor.findMany({
    where: { tenantId, deletedAt: null },
    select: {
      id: true,
      email: true,
      clinicWorkEmail: true,
      clinicLinks: { select: { clinicId: true } },
    },
  });

  const doctorMatches = doctors.filter(
    (d) =>
      normalizeOrderSourceEmailAddress(d.email) === normalizedEmail ||
      normalizeOrderSourceEmailAddress(d.clinicWorkEmail) === normalizedEmail,
  );

  if (doctorMatches.length === 1) {
    const doctor = doctorMatches[0]!;
    const clinicId =
      doctor.clinicLinks.length === 1 ? doctor.clinicLinks[0]!.clinicId : null;
    return { clinicId, doctorId: doctor.id, matched: true, ambiguous: false };
  }
  if (doctorMatches.length > 1) {
    return { clinicId: null, doctorId: null, matched: false, ambiguous: true };
  }

  const clinics = await clientsPrisma.clinic.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, email: true },
  });
  const clinicMatches = clinics.filter(
    (c) => normalizeOrderSourceEmailAddress(c.email) === normalizedEmail,
  );

  if (clinicMatches.length === 1) {
    const clinicId = clinicMatches[0]!.id;
    const linkedDoctors = doctors.filter((d) =>
      d.clinicLinks.some((link) => link.clinicId === clinicId),
    );
    if (linkedDoctors.length === 1) {
      return { clinicId, doctorId: linkedDoctors[0]!.id, matched: true, ambiguous: false };
    }
    if (linkedDoctors.length > 1) {
      return { clinicId: null, doctorId: null, matched: false, ambiguous: true };
    }
  }
  if (clinicMatches.length > 1) {
    return { clinicId: null, doctorId: null, matched: false, ambiguous: true };
  }

  return { clinicId: null, doctorId: null, matched: false, ambiguous: false };
}

export type OrderSourceEmailClientPair = {
  clinicId: string | null;
  doctorId: string;
};

function orderClientPairKey(pair: OrderSourceEmailClientPair): string {
  return `${pair.clinicId ?? ""}:${pair.doctorId}`;
}

/**
 * Слияние истории нарядов, справочника CRM и (опционально) клиента текущего наряда.
 * Приоритет: однозначная история → клиент текущего наряда среди пар → CRM → неоднозначно.
 */
export function resolveOrderSourceEmailClientMatch(
  historyPairs: OrderSourceEmailClientPair[],
  catalog: OrderSourceEmailClientMatch,
  preferOrder?: OrderSourceEmailClientPair | null,
): OrderSourceEmailClientMatch {
  if (historyPairs.length === 1) {
    const pair = historyPairs[0]!;
    return {
      clinicId: pair.clinicId,
      doctorId: pair.doctorId,
      matched: true,
      ambiguous: false,
    };
  }

  if (historyPairs.length > 1) {
    if (preferOrder) {
      const preferKey = orderClientPairKey(preferOrder);
      const preferred = historyPairs.find((p) => orderClientPairKey(p) === preferKey);
      if (preferred) {
        return {
          clinicId: preferred.clinicId,
          doctorId: preferred.doctorId,
          matched: true,
          ambiguous: false,
        };
      }
    }
    if (catalog.matched && !catalog.ambiguous) {
      return catalog;
    }
    return { clinicId: null, doctorId: null, matched: false, ambiguous: true };
  }

  return catalog;
}

export type ResolveClientIdsFromOrderSourceEmailOptions = {
  /** Если почта в истории у нескольких клиентов — взять пару этого наряда. */
  preferOrderId?: string | null;
};

/** Обратный lookup: fromAddress → клиент из истории нарядов или справочника CRM. */
export async function resolveClientIdsFromOrderSourceEmail(
  db: PrismaClient,
  tenantId: string,
  fromAddress: string | null | undefined,
  opts?: ResolveClientIdsFromOrderSourceEmailOptions,
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

  const pairByKey = new Map<string, OrderSourceEmailClientPair>();
  for (const link of links) {
    const addr = normalizeOrderSourceEmailAddress(link.email.fromAddress);
    if (addr !== normalized) continue;
    const key = orderClientPairKey(link.order);
    if (!pairByKey.has(key)) {
      pairByKey.set(key, link.order);
    }
  }
  const historyPairs = [...pairByKey.values()];

  let preferOrder: OrderSourceEmailClientPair | null = null;
  const preferOrderId = opts?.preferOrderId?.trim();
  if (preferOrderId) {
    const order = await db.order.findFirst({
      where: { id: preferOrderId, tenantId },
      select: { clinicId: true, doctorId: true },
    });
    if (order?.doctorId) {
      preferOrder = order;
    }
  }

  const catalog =
    historyPairs.length === 1
      ? { clinicId: null, doctorId: null, matched: false, ambiguous: false }
      : await resolveClientIdsFromClientCatalog(tenantId, normalized);

  return resolveOrderSourceEmailClientMatch(historyPairs, catalog, preferOrder);
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
