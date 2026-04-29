import {
  getClientsPrisma,
  getOrdersPrisma,
  getPricingPrisma,
} from "@/lib/get-domain-prisma";
import { escapeHtml } from "@/lib/html-escape";
import {
  formatConstructionDescription,
  lineAllocatedTotalRub,
  orderCompositionSubtotalAfterDiscountsRub,
} from "@/lib/format-order-construction";
import { orderUrgentPriceMultiplier } from "@/lib/order-urgency";

function moneyRu(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(n);
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return new Response("Bad request", { status: 400 });
  }

  try {
    const [ordersPrisma, clientsPrisma, pricingPrisma] = await Promise.all([
      getOrdersPrisma(),
      getClientsPrisma(),
      getPricingPrisma(),
    ]);
    const order = await ordersPrisma.order.findUnique({
      where: { id: id.trim() },
      include: { constructions: { orderBy: { sortOrder: "asc" } } },
    });
    if (!order) {
      return new Response("Not found", { status: 404 });
    }
    const [doctor, clinic] = await Promise.all([
      clientsPrisma.doctor.findUnique({
        where: { id: order.doctorId },
        select: { fullName: true },
      }),
      order.clinicId
        ? clientsPrisma.clinic.findUnique({ where: { id: order.clinicId } })
        : Promise.resolve(null),
    ]);
    const typeIds = Array.from(
      new Set(order.constructions.map((x) => x.constructionTypeId).filter(Boolean)),
    ) as string[];
    const materialIds = Array.from(
      new Set(order.constructions.map((x) => x.materialId).filter(Boolean)),
    ) as string[];
    const priceListItemIds = Array.from(
      new Set(order.constructions.map((x) => x.priceListItemId).filter(Boolean)),
    ) as string[];
    const [types, materials, priceItems] = await Promise.all([
      typeIds.length
        ? pricingPrisma.constructionType.findMany({
            where: { id: { in: typeIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      materialIds.length
        ? pricingPrisma.material.findMany({
            where: { id: { in: materialIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      priceListItemIds.length
        ? pricingPrisma.priceListItem.findMany({
            where: { id: { in: priceListItemIds } },
            select: { id: true, code: true, name: true },
          })
        : Promise.resolve([]),
    ]);
    const typeById = new Map(types.map((x) => [x.id, x]));
    const materialById = new Map(materials.map((x) => [x.id, x]));
    const priceItemById = new Map(priceItems.map((x) => [x.id, x]));
    const constructions = order.constructions.map((line) => ({
      ...line,
      constructionType: line.constructionTypeId
        ? (typeById.get(line.constructionTypeId) ?? null)
        : null,
      material: line.materialId ? (materialById.get(line.materialId) ?? null) : null,
      priceListItem: line.priceListItemId
        ? (priceItemById.get(line.priceListItemId) ?? null)
        : null,
    }));
    const urgentMult = orderUrgentPriceMultiplier(
      order.isUrgent,
      order.urgentCoefficient,
    );

    const compLines = constructions.map((c) => ({
      quantity: c.quantity,
      unitPrice: c.unitPrice,
      lineDiscountPercent: c.lineDiscountPercent,
    }));
    const orderSub = orderCompositionSubtotalAfterDiscountsRub(
      compLines,
      order.compositionDiscountPercent,
    );
    const total = Math.round(orderSub * urgentMult * 100) / 100;
    let linesWithoutPrice = 0;
    const rowsHtml = constructions
      .map((line, i) => {
        const desc = formatConstructionDescription(line);
        const sum = lineAllocatedTotalRub(
          {
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineDiscountPercent: line.lineDiscountPercent,
          },
          compLines,
          order.compositionDiscountPercent,
          urgentMult,
        );
        if (line.unitPrice == null) linesWithoutPrice += 1;
        return `<tr>
  <td style="padding:8px;border:1px solid #ccc">${i + 1}</td>
  <td style="padding:8px;border:1px solid #ccc">${escapeHtml(desc)}</td>
  <td style="padding:8px;border:1px solid #ccc;text-align:right">${line.quantity}</td>
  <td style="padding:8px;border:1px solid #ccc;text-align:right">${line.unitPrice != null ? moneyRu(line.unitPrice) : "—"}</td>
  <td style="padding:8px;border:1px solid #ccc;text-align:right">${line.unitPrice != null ? moneyRu(sum) : "—"}</td>
</tr>`;
      })
      .join("\n");

    const clinicBlock = clinic
      ? `<p><strong>Заказчик:</strong> ${escapeHtml(clinic.name)}</p>
         ${clinic.legalFullName ? `<p>${escapeHtml(clinic.legalFullName)}</p>` : ""}
         ${clinic.inn ? `<p>ИНН ${escapeHtml(clinic.inn)}</p>` : ""}`
      : `<p><strong>Заказчик:</strong> частная практика (без клиники)</p>`;

    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>Счёт ${escapeHtml(order.orderNumber)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 24px auto; padding: 0 16px; color: #111; }
    h1 { font-size: 1.35rem; }
    table { border-collapse: collapse; width: 100%; margin-top: 16px; }
    th { background: #f4f4f5; text-align: left; padding: 8px; border: 1px solid #ccc; }
    .muted { color: #666; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>Счёт / спецификация к наряду ${escapeHtml(order.orderNumber)}</h1>
  <p class="muted">Дата формирования: ${escapeHtml(new Date().toLocaleString("ru-RU"))}</p>
  ${clinicBlock}
  <p><strong>Врач:</strong> ${escapeHtml(doctor?.fullName ?? "—")}</p>
  ${order.patientName ? `<p><strong>Пациент:</strong> ${escapeHtml(order.patientName)}</p>` : ""}
  <table>
    <thead>
      <tr>
        <th style="width:40px">#</th>
        <th>Наименование работ</th>
        <th style="width:80px;text-align:right">Кол-во</th>
        <th style="width:120px;text-align:right">Цена</th>
        <th style="width:120px;text-align:right">Сумма</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || `<tr><td colspan="5" style="padding:12px;border:1px solid #ccc">Нет позиций</td></tr>`}
    </tbody>
  </table>
  <p style="margin-top:20px;font-size:1.1rem"><strong>Итого:</strong> ${moneyRu(total)}</p>
  ${urgentMult !== 1 ? `<p class="muted">К сумме работ применён коэффициент срочности ×${urgentMult}.</p>` : ""}
  ${linesWithoutPrice > 0 ? `<p class="muted">Позиций без цены: ${linesWithoutPrice} (в сумму не включены).</p>` : ""}
  <p class="muted">Документ сформирован в CRM. При необходимости распечатайте страницу (Ctrl+P) в PDF.</p>
</body>
</html>`;

    const safeFile = `schet-${order.orderNumber.replace(/[^\w.-]+/g, "_")}.html`;
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeFile}"`,
      },
    });
  } catch (e) {
    console.error(e);
    return new Response("Server error", { status: 500 });
  }
}
