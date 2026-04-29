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
