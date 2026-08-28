import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import {
  CLIENT_STATE_MAX_JSON_BYTES,
} from "@/lib/client-state-limits";
import { getPrisma } from "@/lib/get-prisma";
import { KANBAN_CHAT_STATE_KEY, parseKanbanAppState } from "@/lib/kanban/chat-sync";
import { mergeInboundKaitenMirrorFieldsFromStored } from "@/lib/kanban/merge-inbound-kaiten-card-fields";
import { shouldSkipSparseKanbanTenantWrite } from "@/lib/kanban/kanban-tenant-write-guard";
import {
  parseStoredKanbanOrderComments,
  resolveKanbanOrderCommentsToPersist,
} from "@/lib/kanban/kanban-order-comments";
import {
  parseStoredKanbanOrderActivity,
  resolveKanbanOrderActivityToPersist,
} from "@/lib/kanban/kanban-order-activity";

export const dynamic = "force-dynamic";

type Scope = "user" | "tenant";

function parseScope(raw: string | null): Scope | null {
  if (raw === "user" || raw === "tenant") return raw;
  return null;
}

function parseKey(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if (!v) return null;
  if (v.length > 128) return null;
  return v;
}

function isProtectedTenantKanbanStateKey(key: string): boolean {
  return (
    key === KANBAN_CHAT_STATE_KEY ||
    key === "kanbanAppStateV3Demo" ||
    key.startsWith("kanbanCommentsV1:") ||
    key.startsWith("kanbanActivityV1:")
  );
}

export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const url = new URL(req.url);
  const scope = parseScope(url.searchParams.get("scope"));
  const key = parseKey(url.searchParams.get("key"));
  if (!scope || !key) {
    return NextResponse.json(
      { error: "Ожидаются query-параметры scope и key" },
      { status: 400 },
    );
  }

  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 403 });
  }

  const prisma = await getPrisma();
  if (scope === "user") {
    const row = await prisma.userClientState.findUnique({
      where: { userId_key: { userId: session.sub, key } },
      select: { value: true, updatedAt: true },
    });
    return NextResponse.json({
      found: row != null,
      value: row?.value ?? null,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    });
  }

  const row = await prisma.tenantClientState.findUnique({
    where: { tenantId_key: { tenantId, key } },
    select: { value: true, updatedAt: true },
  });
  return NextResponse.json({
    found: row != null,
    value: row?.value ?? null,
    updatedAt: row?.updatedAt?.toISOString() ?? null,
  });
}

type PutBody = {
  scope?: Scope;
  key?: string;
  value?: unknown;
};

export async function PUT(req: Request) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  let rawText: string;
  try {
    rawText = await req.text();
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать тело" }, { status: 400 });
  }

  if (new TextEncoder().encode(rawText).length > CLIENT_STATE_MAX_JSON_BYTES) {
    return NextResponse.json(
      {
        error: "Слишком большой client-state",
        maxBytes: CLIENT_STATE_MAX_JSON_BYTES,
        bytes: new TextEncoder().encode(rawText).length,
      },
      { status: 413 },
    );
  }

  let body: PutBody;
  try {
    body = JSON.parse(rawText) as PutBody;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const scope = parseScope(body.scope ?? null);
  const key = parseKey(body.key);
  if (!scope || !key) {
    return NextResponse.json({ error: "Ожидаются scope и key" }, { status: 400 });
  }

  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 403 });
  }

  try {
    const prisma = await getPrisma();
    const persist = async () => {
      if (body.value === null) {
        if (scope === "tenant" && isProtectedTenantKanbanStateKey(key)) {
          return NextResponse.json(
            { error: "Нельзя удалить состояние канбана" },
            { status: 400 },
          );
        }
        if (scope === "user") {
          await prisma.userClientState.deleteMany({
            where: { userId: session.sub, key },
          });
        } else {
          await prisma.tenantClientState.deleteMany({
            where: { tenantId, key },
          });
        }
        return NextResponse.json({ ok: true, deleted: true });
      }

      if (scope === "user") {
        await prisma.userClientState.upsert({
          where: { userId_key: { userId: session.sub, key } },
          create: {
            userId: session.sub,
            tenantId,
            key,
            value: body.value as never,
          },
          update: { value: body.value as never, tenantId },
        });
        return NextResponse.json({ ok: true, scope, key });
      }

      let valueToStore = body.value;
      if (key.startsWith("kanbanActivityV1:")) {
        const incoming = parseStoredKanbanOrderActivity(body.value);
        const existingRow = await prisma.tenantClientState.findUnique({
          where: { tenantId_key: { tenantId, key } },
          select: { value: true },
        });
        const existing = parseStoredKanbanOrderActivity(existingRow?.value ?? null);
        const resolved = resolveKanbanOrderActivityToPersist(incoming, existing);
        if (resolved === "keep-existing") {
          return NextResponse.json({ ok: true, skipped: "keep-activity" });
        }
        valueToStore = { activity: resolved };
      }
      if (key.startsWith("kanbanCommentsV1:")) {
        const incoming = parseStoredKanbanOrderComments(body.value);
        const existingRow = await prisma.tenantClientState.findUnique({
          where: { tenantId_key: { tenantId, key } },
          select: { value: true },
        });
        const existing = parseStoredKanbanOrderComments(existingRow?.value ?? null);
        const resolved = resolveKanbanOrderCommentsToPersist(incoming, existing);
        if (resolved === "keep-existing") {
          return NextResponse.json({ ok: true, skipped: "keep-comments" });
        }
        valueToStore = { comments: resolved };
      }
      if (key === KANBAN_CHAT_STATE_KEY) {
        const incoming = parseKanbanAppState(body.value);
        if (incoming) {
          const existing = await prisma.tenantClientState.findUnique({
            where: { tenantId_key: { tenantId, key } },
            select: { value: true },
          });
          const stored = parseKanbanAppState(existing?.value ?? null);
          if (stored) {
            mergeInboundKaitenMirrorFieldsFromStored(incoming, stored);
            if (shouldSkipSparseKanbanTenantWrite(incoming, stored)) {
              return NextResponse.json({
                ok: true,
                skipped: "sparse-kanban",
              });
            }
            valueToStore = incoming;
          }
        }
      }
      await prisma.tenantClientState.upsert({
        where: { tenantId_key: { tenantId, key } },
        create: {
          tenantId,
          key,
          value: valueToStore as never,
        },
        update: { value: valueToStore as never },
      });
      return NextResponse.json({ ok: true, scope, key });
    };

    let lastErr: unknown;
    for (let i = 0; i < 4; i += 1) {
      try {
        return await persist();
      } catch (e) {
        lastErr = e;
        const msg = e instanceof Error ? e.message : String(e);
        const transient =
          /database is locked|sqlite_busy|deadlock|serialization failure|p2034|too many connections|connection/i.test(
            msg,
          );
        if (!transient || i === 3) break;
        await new Promise((r) => setTimeout(r, 40 * (i + 1)));
      }
    }
    throw lastErr;
  } catch (e) {
    console.error("[client-state] PUT failed", { scope, key, err: e });
    return NextResponse.json(
      { error: "Не удалось сохранить client-state" },
      { status: 500 },
    );
  }
}
