import { type NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getKaitenRestAuth, kaitenListComments } from "@/lib/kaiten-rest";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { isOrderAttachmentThumbRequest } from "@/lib/order-attachment-thumb";
import { buildOrderAttachmentThumbJpeg } from "@/lib/order-attachment-thumb.server";

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

function fileMetaFromItem(
  item: unknown,
  fileId: number,
  apiBase: string,
  preferThumb: boolean,
): { url: string; name: string | null } | null {
  if (item == null || typeof item !== "object" || Array.isArray(item)) return null;
  const file = item as Record<string, unknown>;
  if (numberField(file, ["id", "file_id", "attachment_id"]) !== fileId) return null;
  const rawUrl = preferThumb
    ? stringField(file, [
        "thumbnail_url",
        "preview_url",
        "url",
        "download_url",
        "src",
      ])
    : stringField(file, ["url", "download_url", "src"]);
  if (!rawUrl) return null;
  return {
    url: resolveKaitenFileUrl(rawUrl, apiBase),
    name: stringField(file, ["name", "file_name", "filename", "title"]),
  };
}

function findFileInRecord(
  record: Record<string, unknown>,
  fileId: number,
  apiBase: string,
  preferThumb: boolean,
): { url: string; name: string | null } | null {
  for (const key of ["files", "attachments", "attached_files", "uploads"] as const) {
    const value = record[key];
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      const hit = fileMetaFromItem(item, fileId, apiBase, preferThumb);
      if (hit) return hit;
    }
  }
  return null;
}

async function fetchKaitenCardFileUrl(
  apiBase: string,
  token: string,
  cardId: number,
  fileId: number,
  preferThumb: boolean,
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
  const fromCard = findFileInRecord(
    card as Record<string, unknown>,
    fileId,
    apiBase,
    preferThumb,
  );
  if (fromCard) return fromCard;

  /* Новые фото часто только во вложениях комментариев, не в card.files. */
  const auth = getKaitenRestAuth();
  if (!auth) return null;
  const comments = await kaitenListComments(auth, cardId);
  if (!comments.ok) return null;
  for (const raw of comments.comments) {
    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) continue;
    const hit = findFileInRecord(
      raw as Record<string, unknown>,
      fileId,
      apiBase,
      preferThumb,
    );
    if (hit) return hit;
  }
  return null;
}

export async function GET(
  request: NextRequest,
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

  const wantThumb = isOrderAttachmentThumbRequest(
    new URL(request.url).searchParams,
  );

  const file = await fetchKaitenCardFileUrl(
    auth.apiBase,
    auth.token,
    order.kaitenCardId,
    fileId,
    wantThumb,
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
  if (!res.ok) {
    return NextResponse.json(
      { error: "Не удалось загрузить файл Kaiten" },
      { status: res.status || 502 },
    );
  }

  if (wantThumb) {
    const buf = Buffer.from(await res.arrayBuffer());
    const thumb = await buildOrderAttachmentThumbJpeg(buf);
    if (thumb) {
      return new Response(new Uint8Array(thumb), {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Length": String(thumb.length),
          "Cache-Control": "private, max-age=86400",
          ...(safeInlineFileName(file.name)
            ? {
                "Content-Disposition": `inline; filename="${safeInlineFileName(file.name)}.jpg"`,
              }
            : {}),
        },
      });
    }
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
        "Content-Length": String(buf.length),
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  if (!res.body) {
    return NextResponse.json(
      { error: "Не удалось загрузить файл Kaiten" },
      { status: 502 },
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
