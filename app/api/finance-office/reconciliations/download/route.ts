import { NextResponse } from "next/server";
import type { ReconciliationSnapshotSlot } from "@prisma/client";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { buildLegalEntityReconciliationZip } from "@/lib/legal-entity-reconciliation-zip";
import { upsertLegalEntityReconciliation } from "@/lib/legal-entity-reconciliation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SLOTS: ReconciliationSnapshotSlot[] = [
  "MONTHLY_FULL",
  "FIRST_HALF",
  "SECOND_HALF",
];

export async function GET(req: Request) {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session?.sub) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  if (access?.FINANCE_OFFICE !== true) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет тенанта" }, { status: 403 });
  }
  const q = new URL(req.url).searchParams;
  const groupKey = String(q.get("groupKey") ?? "").trim();
  const from = String(q.get("from") ?? "").trim();
  const to = String(q.get("to") ?? "").trim();
  const slotRaw = String(q.get("slot") ?? "").trim() as ReconciliationSnapshotSlot;
  const clinicIds = String(q.get("clinicIds") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const title = String(q.get("title") ?? "Сверка").trim() || "Сверка";
  const lockPeriod = q.get("lockPeriod") === "1";
  if (!groupKey || !from || !to || !SLOTS.includes(slotRaw) || clinicIds.length === 0) {
    return NextResponse.json({ error: "Некорректные параметры" }, { status: 400 });
  }

  try {
    const prisma = await getPrisma();
    const { bytes, fileName } = await buildLegalEntityReconciliationZip({
      clinicIds,
      title,
      periodFromStr: from,
      periodToStr: to,
    });
    await upsertLegalEntityReconciliation({
      prisma,
      tenantId,
      groupKey,
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
    console.error("[FO recon download]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Не удалось собрать сверку" },
      { status: 500 },
    );
  }
}
