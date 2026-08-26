import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { readCrmMaintenanceState } from "@/lib/crm-backup/progress-lock";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ phase: null }, { status: 200 });
  }
  const state = readCrmMaintenanceState();
  return NextResponse.json({
    phase: state?.phase ?? null,
    startedAt: state?.startedAt ?? null,
  });
}
