import { getPrisma } from "@/lib/get-prisma";
import { escapeHtml } from "@/lib/html-escape";
import {
  formatConstructionDescription,
  lineAmountRub,
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
    const order = await (await getPrisma()).order.findUnique({
      where: { id: id.trim() },
      include: {
        clinic: true,
        doctor: { select: { fullName: true } },
        constructions: {
          orderBy: { sortOrder: "asc" },
          include: {
            constructionType: { select: { name: true } },
            priceListItem: { select: { code: true, name: true } },
            material: { select: { name: true } },
          },
        },
      },
    });
    if (!order) {
      return new Response("Not found", { status: 404 });
    }

    const urgentMult = orderUrgentPriceMultiplier(
      order.isUrgent,
      order.urgentCoefficient,
    );

    let total = 0;
    let linesWithoutPrice = 0;
    const rowsHtml = order.constructions
      .map((line, i) => {
        const desc = formatConstructionDescription(line);
        const base = lineAmountRub(line.quantity, line.unitPrice);
        const sum = Math.round(base * urgentMult * 100) / 100;
        if (line.unitPrice == null) linesWithoutPrice += 1;
        else total += sum;
        return `<tr>
  <td style="padding:8px;border:1px solid #ccc">${i + 1}</td>
  <td style="padding:8px;border:1px solid #ccc">${escapeHtml(desc)}</td>
  <td style="padding:8px;border:1px solid #ccc;text-align:right">${line.quantity}</td>
  <td style="padding:8px;border:1px solid #ccc;text-align:right">${line.unitPrice != null ? moneyRu(line.unitPrice) : "—"}</td>
  <td style="padding:8px;border:1px solid #ccc;text-align:right">${line.unitPrice != null ? moneyRu(sum) : "—"}</td>
</tr>`;
      })
      .join("\n");

    const clinicBlock = order.clinic
      ? `<p><strong>Заказчик:</strong> ${escapeHtml(order.clinic.name)}</p>
         ${order.clinic.legalFullName ? `<p>${escapeHtml(order.clinic.legalFullName)}</p>` : ""}
         ${order.clinic.inn ? `<p>ИНН ${escapeHtml(order.clinic.inn)}</p>` : ""}`
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
  <p><strong>Врач:</strong> ${escapeHtml(order.doctor.fullName)}</p>
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
