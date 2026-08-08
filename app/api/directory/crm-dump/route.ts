import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { buildCrmMonthDumpZip } from "@/lib/crm-dump/build-month-dump";
import { parseMonthKey } from "@/lib/crm-dump/month-bounds";
import { storeCrmDumpZip } from "@/lib/crm-dump/store";
import { getPrisma } from "@/lib/get-prisma";

export const dynamic = "force-dynamic";
/** Долгая выборка месяца + zip. */
export const maxDuration = 300;

function isOwnerSession(session: {
  role: string;
  actualRole?: string;
}): boolean {
  return (session.actualRole ?? session.role) === "OWNER";
}

/**
 * OWNER: сырой дамп CRM за календарный месяц → zip (download + запись в storage).
 * Только чтение БД. Обезличивание — отдельно после выгрузки.
 */
export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  if (!isOwnerSession(session)) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  if (session.demo) {
    return NextResponse.json(
      { error: "Дамп недоступен в демо-режиме" },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    month?: string;
  } | null;
  const monthKey = String(body?.month ?? "").trim();
  if (!parseMonthKey(monthKey)) {
    return NextResponse.json(
      { error: "Укажите месяц в формате YYYY-MM" },
      { status: 400 },
    );
  }

  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет тенанта" }, { status: 400 });
  }

  try {
    const db = await getPrisma();
    const built = await buildCrmMonthDumpZip({
      db,
      tenantId,
      monthKey,
    });

    const stored = await storeCrmDumpZip({
      tenantId,
      monthKey: built.meta.month,
      fileName: built.fileName,
      zipBytes: built.zipBytes,
    });

    return new NextResponse(new Uint8Array(built.zipBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${built.fileName}"`,
        "Cache-Control": "no-store",
        "X-Crm-Dump-Month": built.meta.month,
        "X-Crm-Dump-Orders": String(built.meta.orderCount),
        "X-Crm-Dump-Users": String(built.meta.userCount),
        "X-Crm-Dump-Storage": stored.storage,
        "X-Crm-Dump-Storage-Path": encodeURIComponent(stored.keyOrPath),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка дампа";
    console.error("[crm-dump]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
