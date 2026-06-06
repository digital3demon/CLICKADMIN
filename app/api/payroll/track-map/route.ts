import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { canConfigurePayroll } from "@/lib/payroll";
import {
  PAYROLL_USER_TRACK_LABELS,
  PAYROLL_USER_TRACK_VALUES,
  normalizePayrollKindTrackMap,
  parsePayrollUserTrack,
} from "@/lib/payroll-tracks";
import {
  getPayrollKindTrackMap,
  setPayrollKindTrackMap,
} from "@/lib/payroll-tracks.server";
import {
  PAYROLL_WORK_KIND_LABELS,
  PAYROLL_WORK_KIND_VALUES,
} from "@/lib/payroll";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (!canConfigurePayroll(session.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const tenantId = await requireSessionTenantId(session);
  const map = await getPayrollKindTrackMap(await getPrisma(), tenantId);
  return NextResponse.json({
    map,
    kinds: PAYROLL_WORK_KIND_VALUES.map((kind) => ({
      kind,
      label: PAYROLL_WORK_KIND_LABELS[kind],
    })),
    tracks: PAYROLL_USER_TRACK_VALUES.map((track) => ({
      track,
      label: PAYROLL_USER_TRACK_LABELS[track],
    })),
  });
}

export async function PATCH(req: Request) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (!canConfigurePayroll(session.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  let body: { map?: unknown };
  try {
    body = (await req.json()) as { map?: unknown };
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  if (body.map == null || typeof body.map !== "object") {
    return NextResponse.json({ error: "Ожидается map" }, { status: 400 });
  }
  const raw = body.map as Record<string, unknown>;
  for (const kind of PAYROLL_WORK_KIND_VALUES) {
    const track = parsePayrollUserTrack(raw[kind]);
    if (!track) {
      return NextResponse.json(
        { error: `Некорректное направление для «${PAYROLL_WORK_KIND_LABELS[kind]}»` },
        { status: 400 },
      );
    }
  }
  const tenantId = await requireSessionTenantId(session);
  const map = await setPayrollKindTrackMap(
    await getPrisma(),
    tenantId,
    normalizePayrollKindTrackMap(body.map),
  );
  return NextResponse.json({ ok: true, map });
}
