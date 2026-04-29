import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { applyKaitenBlockForOrderIfUnblocked } from "@/lib/apply-kaiten-block-from-list-tag";
import { applyKaitenUnblockForOrderIfBlocked } from "@/lib/apply-kaiten-unblock-from-list-tag";
import { customListTagLabelMeansKaitenBlock } from "@/lib/custom-list-tag-kaiten-block-label";
import { customListTagLabelMeansKaitenUnblock } from "@/lib/custom-list-tag-kaiten-unblock-label";
import {
  isValidCustomListTagLabel,
  listTagCustomLabel,
} from "@/lib/order-list-tag-filter";

function isPrismaUniqueError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P2002"
  );
}

/** Добавить / удалить произвольный тег списка заказов у наряда. */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  let body: { label?: unknown; blockReason?: unknown };
  try {
    body = (await req.json()) as { label?: unknown; blockReason?: unknown };
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const label =
    typeof body.label === "string" ? body.label.trim() : "";
  const blockReasonRaw =
    typeof body.blockReason === "string" ? body.blockReason.trim() : "";

  try {
    const order = await (await getPrisma()).order.findUnique({
      where: { id: id.trim() },
      select: { id: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
    }

    /** Служебная метка: только снять блокировку Kaiten, без записи тега в CRM. */
    if (customListTagLabelMeansKaitenUnblock(label)) {
      const kaitenUnblock = await applyKaitenUnblockForOrderIfBlocked(id.trim());
      return NextResponse.json({
        tag: null,
        filterKey: null,
        kaitenUnblock,
        unblockOnly: true as const,
      });
    }

    /** Служебная метка: заблокировать в Kaiten с причиной (`blockReason`), без тега в CRM. */
    if (customListTagLabelMeansKaitenBlock(label)) {
      if (!blockReasonRaw) {
        return NextResponse.json(
          { error: "Укажите причину блокировки в поле blockReason (текст для Kaiten и CRM)" },
          { status: 400 },
        );
      }
      const kaitenBlock = await applyKaitenBlockForOrderIfUnblocked(
        id.trim(),
        blockReasonRaw,
      );
      return NextResponse.json({
        tag: null,
        filterKey: null,
        kaitenBlock,
        blockOnly: true as const,
      });
    }

    if (!isValidCustomListTagLabel(label)) {
      return NextResponse.json(
        {
          error:
            "Тег: 1–48 символов, буквы/цифры/пробелы/._- без двоеточия и переносов строк",
        },
        { status: 400 },
      );
    }

    const row = await (await getPrisma()).orderCustomTag.create({
      data: { orderId: id.trim(), label: label.trim() },
      select: { id: true, label: true },
    });

    return NextResponse.json({
      tag: row,
      filterKey: listTagCustomLabel(label),
    });
  } catch (e) {
    if (isPrismaUniqueError(e)) {
      return NextResponse.json(
        { error: "Такой тег у наряда уже есть" },
        { status: 409 },
      );
    }
    console.error("[POST list-tags]", e);
    return NextResponse.json({ error: "Не удалось добавить тег" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  const url = new URL(req.url);
  const label = url.searchParams.get("label")?.trim() ?? "";
  if (!isValidCustomListTagLabel(label)) {
    return NextResponse.json({ error: "Некорректная метка тега" }, { status: 400 });
  }

  try {
    const res = await (await getPrisma()).orderCustomTag.deleteMany({
      where: { orderId: id.trim(), label: label.trim() },
    });
    if (res.count === 0) {
      return NextResponse.json({ error: "Тег не найден" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE list-tags]", e);
    return NextResponse.json({ error: "Не удалось удалить тег" }, { status: 500 });
  }
}
