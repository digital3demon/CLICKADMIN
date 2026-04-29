import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
/** Скачать автосверку (xlsx). */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
    }

    const row = await (await getPrisma()).clinicReconciliationSnapshot.findUnique({
      where: { id: id.trim() },
      select: {
        periodFromStr: true,
        periodToStr: true,
        xlsxBytes: true,
      },
    });
    if (!row) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }

    const asciiName = `svarka_auto_${row.periodFromStr}_${row.periodToStr}.xlsx`.replace(
      /[^\w.\-]/g,
      "_",
    );
    const raw = row.xlsxBytes;
    const u8 = raw instanceof Uint8Array ? raw : new Uint8Array(raw);

    return new NextResponse(u8, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${asciiName}"`,
      },
    });
  } catch (e) {
    console.error("[GET reconciliation-snapshot file]", e);
    return NextResponse.json({ error: "Ошибка выдачи файла" }, { status: 500 });
  }
}

/** Скрыть уведомление в «Обратите внимание». */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      dismissed?: boolean;
    };
    if (body.dismissed !== true) {
      return NextResponse.json({ error: "Ожидался dismissed: true" }, { status: 400 });
    }

    await (await getPrisma()).clinicReconciliationSnapshot.updateMany({
      where: { id: id.trim(), dismissedAt: null },
      data: { dismissedAt: new Date() },
    });

    try {
      revalidateTag("attention-reminders");
    } catch {
      /* ignore */
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PATCH reconciliation-snapshot]", e);
    return NextResponse.json({ error: "Не удалось обновить" }, { status: 500 });
  }
}
