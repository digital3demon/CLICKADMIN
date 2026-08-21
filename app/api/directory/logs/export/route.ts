import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import {
  buildCrmLogExportText,
  parseCrmLogExportChannel,
  parseCrmLogExportLevel,
} from "@/lib/server/crm-log-export";
import { formatLocalDayKey } from "@/lib/server/log-dir";

export const dynamic = "force-dynamic";

function todayDefault(): string {
  return formatLocalDayKey(new Date());
}

/** Выгрузка логов CRM за период в текстовый файл (только владелец). */
export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  if (session.role !== "OWNER" || session.demo) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const url = new URL(req.url);
  const from = url.searchParams.get("from")?.trim() || todayDefault();
  const to = url.searchParams.get("to")?.trim() || from;
  const minLevel = parseCrmLogExportLevel(url.searchParams.get("level"));
  const channel = parseCrmLogExportChannel(url.searchParams.get("channel"));

  const result = await buildCrmLogExportText({ from, to, minLevel, channel });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  const filename = `crm-logs_${from}_${to}.txt`;
  return new NextResponse(result.text, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Log-Line-Count": String(result.lineCount),
      "X-Log-Truncated": result.truncated ? "1" : "0",
    },
  });
}
