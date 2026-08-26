/**
 * OWNER: восстановление из zip полного бекапа. Перезаписывает живую БД.
 * Подтверждение фразой ВОССТАНОВИТЬ. Демо запрещено.
 */
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { restoreCrmBackupFromZip } from "@/lib/crm-backup/restore-backup";
import { CRM_BACKUP_CONFIRM_PHRASE } from "@/lib/crm-backup/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isOwnerSession(session: {
  role: string;
  actualRole?: string;
}): boolean {
  return (session.actualRole ?? session.role) === "OWNER";
}

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
      { error: "Восстановление недоступно в демо-режиме" },
      { status: 403 },
    );
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Нужен файл бекапа" }, { status: 400 });
  }
  const confirm = String(form.get("confirm") || "");
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Выберите zip-файл" }, { status: 400 });
  }
  const zipBytes = Buffer.from(await file.arrayBuffer());
  if (zipBytes.length < 32) {
    return NextResponse.json({ error: "Файл слишком маленький" }, { status: 400 });
  }

  try {
    const result = await restoreCrmBackupFromZip({
      zipBytes,
      confirm,
    });
    return NextResponse.json({
      ok: true,
      engine: result.engine,
      localFiles: result.localFiles,
      s3Files: result.s3Files,
      hint: "Если CRM не открывается — перезапустите процесс сервера.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка восстановления";
    console.error("[crm-backup-restore]", e);
    const status = msg.includes(CRM_BACKUP_CONFIRM_PHRASE) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
