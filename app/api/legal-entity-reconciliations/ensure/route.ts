import { NextResponse } from "next/server";
import type { ReconciliationSnapshotSlot } from "@prisma/client";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { upsertLegalEntityReconciliation } from "@/lib/legal-entity-reconciliation";

export const dynamic = "force-dynamic";

const SLOTS: ReconciliationSnapshotSlot[] = [
  "MONTHLY_FULL",
  "FIRST_HALF",
  "SECOND_HALF",
];

export async function POST(req: Request) {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session?.sub) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  const ok =
    access?.FINANCE_OFFICE === true ||
    session.role === "OWNER" ||
    access?.CLIENTS_EDIT === true;
  if (!ok) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет тенанта" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    groupKey?: string;
    slot?: string;
    from?: string;
    to?: string;
    title?: string;
    lockPeriod?: boolean;
  };
  const slot = String(body.slot ?? "") as ReconciliationSnapshotSlot;
  const groupKey = String(body.groupKey ?? "").trim();
  const from = String(body.from ?? "").trim();
  const to = String(body.to ?? "").trim();
  if (!groupKey || !from || !to || !SLOTS.includes(slot)) {
    return NextResponse.json({ error: "Некорректные параметры" }, { status: 400 });
  }
  const prisma = await getPrisma();
  const { id } = await upsertLegalEntityReconciliation({
    prisma,
    tenantId,
    groupKey,
    slot,
    periodFromStr: from,
    periodToStr: to,
    legalEntityLabel: String(body.title ?? "Сверка").trim() || "Сверка",
    lockPeriod: body.lockPeriod === true,
  });
  return NextResponse.json({ id });
}
