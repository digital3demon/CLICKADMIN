import { NextResponse } from "next/server";
import type { ReconciliationSnapshotSlot } from "@prisma/client";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { clinicScopeGroupKey } from "@/lib/clinic-inn-key";
import { buildLegalEntityReconciliationZip } from "@/lib/legal-entity-reconciliation-zip";
import { upsertLegalEntityReconciliation } from "@/lib/legal-entity-reconciliation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SLOTS: ReconciliationSnapshotSlot[] = [
  "MONTHLY_FULL",
  "FIRST_HALF",
  "SECOND_HALF",
];

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session?.sub) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  if (
    access?.CLIENTS !== true &&
    access?.CLIENTS_EDIT !== true &&
    access?.FINANCE_OFFICE !== true
  ) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет тенанта" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const q = new URL(req.url).searchParams;
  const from = String(q.get("from") ?? "").trim();
  const to = String(q.get("to") ?? "").trim();
  const slotRaw = String(q.get("slot") ?? "").trim() as ReconciliationSnapshotSlot;
  const title = String(q.get("title") ?? "Сверка").trim() || "Сверка";
  const lockPeriod = q.get("lockPeriod") === "1";
  if (!from || !to || !SLOTS.includes(slotRaw)) {
    return NextResponse.json({ error: "Некорректные параметры" }, { status: 400 });
  }
  const prisma = await getPrisma();
  const clinic = await prisma.clinic.findFirst({
    where: { id: id.trim(), tenantId },
    select: { id: true, name: true },
  });
  if (!clinic) {
    return NextResponse.json({ error: "Клиника не найдена" }, { status: 404 });
  }
  try {
    const { bytes, fileName } = await buildLegalEntityReconciliationZip({
      clinicIds: [clinic.id],
      title: clinic.name || title,
      periodFromStr: from,
      periodToStr: to,
    });
    await upsertLegalEntityReconciliation({
      prisma,
      tenantId,
      groupKey: clinicScopeGroupKey(clinic.id),
      slot: slotRaw,
      periodFromStr: from,
      periodToStr: to,
      legalEntityLabel: title,
      lockPeriod,
      touchDownload: true,
    });
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (e) {
    console.error("[clinic recon download]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Не удалось собрать сверку" },
      { status: 500 },
    );
  }
}
