import { type NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getKaitenRestAuth } from "@/lib/kaiten-rest";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";

function stringField(o: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = o[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function numberField(o: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = o[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function resolveKaitenFileUrl(rawUrl: string, apiBase: string): string {
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  return new URL(rawUrl, `${apiBase.replace(/\/+$/, "")}/`).toString();
}

function safeInlineFileName(name: string | null): string | null {
  const safe = name?.replace(/[\r\n"]/g, "").trim();
  return safe || null;
}

async function fetchKaitenCardFileUrl(
  apiBase: string,
  token: string,
  cardId: number,
  fileId: number,
): Promise<{ url: string; name: string | null } | null> {
  const cardRes = await fetch(`${apiBase}/cards/${cardId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (!cardRes.ok) return null;
  const card = (await cardRes.json().catch(() => null)) as unknown;
  if (card == null || typeof card !== "object" || Array.isArray(card)) return null;
  const files = (card as Record<string, unknown>).files;
  if (!Array.isArray(files)) return null;

  for (const item of files) {
    if (item == null || typeof item !== "object" || Array.isArray(item)) continue;
    const file = item as Record<string, unknown>;
    if (numberField(file, ["id", "file_id", "attachment_id"]) !== fileId) continue;
    const rawUrl = stringField(file, ["url", "download_url", "src"]);
    if (!rawUrl) return null;
    return {
      url: resolveKaitenFileUrl(rawUrl, apiBase),
      name: stringField(file, ["name", "file_name", "filename", "title"]),
    };
  }
  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const resolvedParams = await params;
  const orderId = resolvedParams.id.trim();
  const fileIdRaw = resolvedParams.fileId.trim();
  const fileId = Number(fileIdRaw);
  if (!orderId || !Number.isFinite(fileId)) {
    return NextResponse.json({ error: "Некорректный файл" }, { status: 400 });
  }

  const session = await getSessionFromCookies();
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const auth = getKaitenRestAuth();
  if (!auth) {
    return NextResponse.json({ error: "Kaiten не настроен" }, { status: 503 });
  }

  const order = await (await getOrdersPrisma()).order.findFirst({
    where: { id: orderId, tenantId },
    select: { kaitenCardId: true },
  });
  if (!order?.kaitenCardId) {
    return NextResponse.json({ error: "Карточка Kaiten не найдена" }, { status: 404 });
  }

  const file = await fetchKaitenCardFileUrl(
    auth.apiBase,
    auth.token,
    order.kaitenCardId,
    fileId,
  );
  if (!file) {
    return NextResponse.json(
      { error: "Файл Kaiten не найден" },
      { status: 404 },
    );
  }

  let res = await fetch(file.url);
  if (res.status === 401 || res.status === 403) {
    res = await fetch(file.url, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
  }
  if (!res.ok || !res.body) {
    return NextResponse.json(
      { error: "Не удалось загрузить файл Kaiten" },
      { status: res.status || 502 },
    );
  }

  return new Response(res.body, {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
      ...(safeInlineFileName(file.name)
        ? { "Content-Disposition": `inline; filename="${safeInlineFileName(file.name)}"` }
        : {}),
      "Cache-Control": "private, max-age=300",
    },
  });
}
