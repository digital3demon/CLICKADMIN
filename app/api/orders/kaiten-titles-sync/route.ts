import { NextResponse } from "next/server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getKaitenRestAuth } from "@/lib/kaiten-rest";
import { kaitenRetryAfterSeconds } from "@/lib/kaiten-rate-limit";
import { syncKaitenColumnTitlesForOrderIds } from "@/lib/kaiten-sync-order-column-titles";

type Body = { orderIds?: unknown; includeComments?: unknown };

function isConnAbortError(e: unknown): boolean {
  if (e == null || typeof e !== "object") return false;
  const o = e as { name?: string; code?: string; message?: string };
  return (
    o.name === "AbortError" ||
    o.code === "ECONNRESET" ||
    o.code === "EPIPE" ||
    o.code === "ERR_STREAM_PREMATURE_CLOSE" ||
    (typeof o.message === "string" && o.message.toLowerCase().includes("aborted"))
  );
}

/** Пакетное обновление подписи колонки Kaiten в БД (для автообновления списков). */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const raw = body.orderIds;
  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: "Ожидается orderIds: string[]" }, { status: 400 });
  }
  const orderIds = raw
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean);
  if (orderIds.length === 0) {
    return NextResponse.json({
      ok: true,
      titles: {},
      stageDueByOrderId: {},
      membersByOrderId: {},
      syncedCount: 0,
      listUiChanged: false,
      errorCount: 0,
      clicklabByOrderId: {},
      kaitenLabMentionDbChanged: false,
      newCorrectionsImported: false,
      newProstheticsImported: false,
    });
  }

  const auth = getKaitenRestAuth();
  if (!auth) {
    return NextResponse.json(
      { error: "Kaiten не настроен" },
      { status: 503 },
    );
  }

  const includeComments =
    body.includeComments === true ||
    body.includeComments === 1 ||
    body.includeComments === "1" ||
    body.includeComments === "true";

  try {
    const prisma = await getOrdersPrisma();
    const pendingCorrBefore = await prisma.orderChatCorrection.count({
      where: { resolvedAt: null, rejectedAt: null },
    });
    const pendingProsthBefore = await prisma.orderProstheticsRequest.count({
      where: { resolvedAt: null, rejectedAt: null },
    });
    const {
      titles,
      stageDueByOrderId,
      membersByOrderId,
      syncedCount,
      listUiChanged,
      errorCount,
      clicklabByOrderId,
      kaitenLabMentionDbChanged,
      rateLimited,
    } = await syncKaitenColumnTitlesForOrderIds(prisma, auth, orderIds, {
      includeComments,
    });
    const pendingCorrAfter = await prisma.orderChatCorrection.count({
      where: { resolvedAt: null, rejectedAt: null },
    });
    const pendingProsthAfter = await prisma.orderProstheticsRequest.count({
      where: { resolvedAt: null, rejectedAt: null },
    });
    const newCorrectionsImported = pendingCorrAfter > pendingCorrBefore;
    const newProstheticsImported = pendingProsthAfter > pendingProsthBefore;

    const payload = {
      ok: !rateLimited,
      titles,
      stageDueByOrderId,
      membersByOrderId,
      syncedCount,
      listUiChanged,
      errorCount,
      clicklabByOrderId,
      kaitenLabMentionDbChanged,
      newCorrectionsImported,
      newProstheticsImported,
      rateLimited,
      ...(rateLimited
        ? { error: "Слишком много запросов к Kaiten, повторите позже" }
        : {}),
    };

    if (rateLimited) {
      return NextResponse.json(payload, {
        status: 429,
        headers: { "Retry-After": kaitenRetryAfterSeconds() },
      });
    }

    return NextResponse.json(payload);
  } catch (e) {
    if (isConnAbortError(e) || req.signal?.aborted) {
      return NextResponse.json(
        { ok: false, error: "Соединение прервано" },
        { status: 499 },
      );
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[kaiten-titles-sync]", msg, e);
    return NextResponse.json(
      { ok: false, error: "Синхронизация не удалась" },
      { status: 500 },
    );
  }
}
