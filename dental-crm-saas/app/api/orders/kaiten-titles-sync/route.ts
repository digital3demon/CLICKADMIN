import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { getKaitenRestAuth } from "@/lib/kaiten-rest";
import { syncKaitenColumnTitlesForOrderIds } from "@/lib/kaiten-sync-order-column-titles";

type Body = { orderIds?: unknown };

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
      syncedCount: 0,
      errorCount: 0,
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

  try {
    const prisma = await getPrisma();
    const pendingCorrBefore = await prisma.orderChatCorrection.count({
      where: { resolvedAt: null, rejectedAt: null },
    });
    const pendingProsthBefore = await prisma.orderProstheticsRequest.count({
      where: { resolvedAt: null, rejectedAt: null },
    });
    const { titles, syncedCount, errorCount } = await syncKaitenColumnTitlesForOrderIds(
      prisma,
      auth,
      orderIds,
    );
    const pendingCorrAfter = await prisma.orderChatCorrection.count({
      where: { resolvedAt: null, rejectedAt: null },
    });
    const pendingProsthAfter = await prisma.orderProstheticsRequest.count({
      where: { resolvedAt: null, rejectedAt: null },
    });
    const newCorrectionsImported = pendingCorrAfter > pendingCorrBefore;
    const newProstheticsImported = pendingProsthAfter > pendingProsthBefore;

    return NextResponse.json({
      ok: true,
      titles,
      syncedCount,
      errorCount,
      newCorrectionsImported,
      newProstheticsImported,
    });
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
