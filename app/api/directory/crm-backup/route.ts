/**
 * OWNER: статус / ручной полный бекап / скачивание текущего zip.
 * SQLite: копируем файл БД (+ WAL). При SQLITE_BUSY — повтор с клиента.
 */
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { createAndStoreCrmBackup } from "@/lib/crm-backup/create-backup";
import {
  loadCurrentCrmBackupMeta,
  loadCurrentCrmBackupZip,
} from "@/lib/crm-backup/store";
import { isCrmBackupDisabled } from "@/lib/crm-backup/types";
import { DEFAULT_TENANT_ID } from "@/lib/tenant-constants";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isOwnerSession(session: {
  role: string;
  actualRole?: string;
}): boolean {
  return (session.actualRole ?? session.role) === "OWNER";
}

async function requireOwner() {
  const session = await getSessionFromCookies();
  if (!session) {
    return {
      error: NextResponse.json({ error: "Нужна авторизация" }, { status: 401 }),
    };
  }
  if (!isOwnerSession(session)) {
    return {
      error: NextResponse.json({ error: "Нет доступа" }, { status: 403 }),
    };
  }
  if (session.demo) {
    return {
      error: NextResponse.json(
        { error: "Бекап недоступен в демо-режиме" },
        { status: 403 },
      ),
    };
  }
  return { tenantId: DEFAULT_TENANT_ID };
}

export async function GET(req: Request) {
  const gate = await requireOwner();
  if ("error" in gate) return gate.error;

  const download = new URL(req.url).searchParams.get("download") === "1";
  if (download) {
    const zip = await loadCurrentCrmBackupZip(gate.tenantId);
    if (!zip) {
      return NextResponse.json({ error: "Бекапа ещё нет" }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(zip), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition":
          'attachment; filename="crm-backup-current.zip"',
        "Cache-Control": "no-store",
      },
    });
  }

  const last = await loadCurrentCrmBackupMeta(gate.tenantId);
  return NextResponse.json({
    last,
    disabled: isCrmBackupDisabled(),
  });
}

export async function POST() {
  const gate = await requireOwner();
  if ("error" in gate) return gate.error;
  if (isCrmBackupDisabled()) {
    return NextResponse.json(
      { error: "Авто- и ручной бекап отключены (CRM_BACKUP_DISABLE)" },
      { status: 503 },
    );
  }
  try {
    const last = await createAndStoreCrmBackup({
      tenantId: gate.tenantId,
      source: "manual",
    });
    return NextResponse.json({ ok: true, last });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка бекапа";
    console.error("[crm-backup]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
