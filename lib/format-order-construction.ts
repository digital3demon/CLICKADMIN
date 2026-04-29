import type { ConstructionCategory, JawArch } from "@prisma/client";

type LineForLabel = {
  category: ConstructionCategory;
  constructionType: { name: string } | null;
  priceListItem?: { code: string; name: string } | null;
  material: { name: string } | null;
  shade: string | null;
  teethFdi: unknown;
  bridgeFromFdi: string | null;
  bridgeToFdi: string | null;
  arch: JawArch | null;
};

const ARCH_RU: Record<JawArch, string> = {
  UPPER: "верхняя дуга",
  LOWER: "нижняя дуга",
  BOTH: "обе дуги",
};

function teethList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean);
}

/** Человекочитаемое описание позиции наряда (для сверки и отчётов). */
export function formatConstructionDescription(line: LineForLabel): string {
  if (line.category === "PRICE_LIST") {
    const pl = line.priceListItem;
    if (pl) {
      const code = pl.code?.trim();
      const name = pl.name?.trim() || "Позиция прайса";
      return code ? `${code} · ${name}` : name;
    }
    return "Позиция прайса";
  }

  const typeName = line.constructionType?.name?.trim() || "Работа";
  const parts: string[] = [typeName];

  switch (line.category) {
    case "FIXED":
    case "MISSING_TEETH":
    case "CONNECTING": {
      const teeth = teethList(line.teethFdi);
      if (teeth.length) parts.push(`зубы ${teeth.join(", ")}`);
      break;
    }
    case "BRIDGE": {
      if (line.bridgeFromFdi && line.bridgeToFdi) {
        parts.push(`мост ${line.bridgeFromFdi}–${line.bridgeToFdi}`);
      }
      break;
    }
    case "ARCH": {
      if (line.arch) parts.push(ARCH_RU[line.arch]);
      break;
    }
    default:
      break;
  }

  if (line.material?.name?.trim()) {
    parts.push(`материал: ${line.material.name.trim()}`);
  }
  if (line.shade?.trim()) {
    parts.push(`цвет: ${line.shade.trim()}`);
  }

  return parts.join(" · ");
}

export function lineAmountRub(quantity: number, unitPrice: number | null): number {
  const q = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
  const p = unitPrice != null && Number.isFinite(unitPrice) ? unitPrice : 0;
  return Math.round(q * p * 100) / 100;
}

/** 0–100 для скидок в % */
export function clampPercent0to100(n: number | null | undefined): number {
  if (n == null || !Number.isFinite(n)) return 0;
  if (n <= 0) return 0;
  if (n >= 100) return 100;
  return Math.round(n * 100) / 100;
}

/** Разбор поля скидки из черновика формы (строка). */
export function parseDraftDiscountPercentString(raw: string): number {
  const t = raw.trim();
  if (t === "") return 0;
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return clampPercent0to100(n);
}

/** Сумма по строке: цена×кол-во с учётом скидки на позицию (до общей скидки на наряд). */
export function lineNetAfterLineDiscountRub(
  quantity: number,
  unitPrice: number | null,
  lineDiscountPercent: number | null | undefined,
): number {
  const base = lineAmountRub(quantity, unitPrice);
  const d = clampPercent0to100(
    lineDiscountPercent == null ? 0 : Number(lineDiscountPercent),
  );
  return Math.round(base * (1 - d / 100) * 100) / 100;
}

type LineForComp = {
  quantity: number;
  unitPrice: number | null;
  lineDiscountPercent?: number | null;
};

/**
 * Сумма по «Составу заказа» после скидок по строкам и общей скидки на наряд (без срочности).
 */
export function orderCompositionSubtotalAfterDiscountsRub(
  lines: LineForComp[],
  compositionDiscountPercent: number | null | undefined,
): number {
  const lineSubs = lines.map((l) =>
    lineNetAfterLineDiscountRub(
      l.quantity,
      l.unitPrice,
      l.lineDiscountPercent,
    ),
  );
  const sumSub = lineSubs.reduce((a, b) => a + b, 0);
  const od = clampPercent0to100(
    compositionDiscountPercent == null
      ? 0
      : Number(compositionDiscountPercent),
  );
  return Math.round(sumSub * (1 - od / 100) * 100) / 100;
}

/**
 * Сумма по строке в отчётах/сверке: доля итого наряда (после всех скидок и срочности), пропорционально «весу» строки.
 */
export function lineAllocatedTotalRub(
  line: LineForComp,
  allLines: LineForComp[],
  compositionDiscountPercent: number | null | undefined,
  urgentMultiplier: number,
): number {
  const m =
    Number.isFinite(urgentMultiplier) && urgentMultiplier > 0
      ? urgentMultiplier
      : 1;
  const subs = allLines.map((l) =>
    lineNetAfterLineDiscountRub(l.quantity, l.unitPrice, l.lineDiscountPercent),
  );
  const sumSub = subs.reduce((a, b) => a + b, 0);
  if (sumSub <= 0) return 0;
  const my = lineNetAfterLineDiscountRub(
    line.quantity,
    line.unitPrice,
    line.lineDiscountPercent,
  );
  const orderSub = orderCompositionSubtotalAfterDiscountsRub(
    allLines,
    compositionDiscountPercent,
  );
  return Math.round((my / sumSub) * orderSub * m * 100) / 100;
}
