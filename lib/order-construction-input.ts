import {
  ConstructionCategory,
  type JawArch,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";
import { isValidPermanentFdi } from "@/lib/fdi-teeth";

export const JAW_ARCH_SET = new Set<string>(["UPPER", "LOWER", "BOTH"]);

export function parseLineQuantity(n: unknown): number {
  if (n == null || n === "") return 1;
  const x = Number(n);
  if (!Number.isFinite(x) || x < 1) return 1;
  if (x > 1_000_000) return 1_000_000;
  return Math.floor(x);
}

export function parseUnitPriceRub(n: unknown): number | null {
  if (n == null || n === "") return null;
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0) return null;
  return Math.round(x * 100) / 100;
}

/** Скидка на позицию, 0–100 % */
export function parseLineDiscountPercent(n: unknown): number {
  if (n == null || n === "") return 0;
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0) return 0;
  if (x > 100) return 100;
  return Math.round(x * 100) / 100;
}

function trimOrNull(v: unknown): string | null {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export type BuildConstructionsError = { status: number; error: string };

/**
 * Преобразует JSON-массив позиций наряда в Prisma create-объекты (без order connect).
 * Позиция прайса: { priceListItemId, quantity?, unitPrice? } — без зубов и типа конструкции.
 */
export async function buildConstructionCreatesFromInput(
  prisma: PrismaClient,
  raw: unknown,
  opts?: { clinicId?: string | null },
): Promise<
  | { ok: true; creates: Prisma.OrderConstructionUncheckedCreateWithoutOrderInput[] }
  | { ok: false; err: BuildConstructionsError }
> {
  if (raw == null) {
    return { ok: true, creates: [] };
  }
  if (!Array.isArray(raw)) {
    return {
      ok: false,
      err: { status: 400, error: "Поле constructions должно быть массивом" },
    };
  }

  const items = raw as Record<string, unknown>[];
  const creates: Prisma.OrderConstructionUncheckedCreateWithoutOrderInput[] = [];

  const typeIds = new Set<string>();
  const materialIds = new Set<string>();
  const priceListIds = new Set<string>();

  for (const c of items) {
    if (!c || typeof c !== "object") continue;
    const bf = trimOrNull(c.bridgeFromFdi);
    const bt = trimOrNull(c.bridgeToFdi);
    if (bf && bt) {
      const tid = trimOrNull(c.constructionTypeId);
      if (tid) typeIds.add(tid);
      const mid = trimOrNull(c.materialId);
      if (mid) materialIds.add(mid);
      continue;
    }
    const plid = trimOrNull(c.priceListItemId);
    if (plid) {
      priceListIds.add(plid);
      continue;
    }
    const tid = String(c.constructionTypeId ?? "").trim();
    if (!tid) {
      return {
        ok: false,
        err: {
          status: 400,
          error:
            "У каждой позиции укажите тип работы (constructionTypeId) или позицию прайса (priceListItemId)",
        },
      };
    }
    typeIds.add(tid);
    const mid = trimOrNull(c.materialId);
    if (mid) materialIds.add(mid);
  }

  const foundTypes = await prisma.constructionType.findMany({
    where: { id: { in: [...typeIds] } },
  });
  if (foundTypes.length !== typeIds.size) {
    return {
      ok: false,
      err: { status: 400, error: "Указан неизвестный тип работы" },
    };
  }

  const foundPriceItems =
    priceListIds.size > 0
      ? await prisma.priceListItem.findMany({
          where: { id: { in: [...priceListIds] } },
          select: { id: true, priceRub: true },
        })
      : [];
  if (foundPriceItems.length !== priceListIds.size) {
    return {
      ok: false,
      err: { status: 400, error: "Указана неизвестная позиция прайса" },
    };
  }
  const defaultPriceByPlId = new Map(
    foundPriceItems.map((p) => [p.id, p.priceRub]),
  );
  const clinicId = opts?.clinicId?.trim() ? opts.clinicId.trim() : null;
  const overridePriceByPlId =
    clinicId && priceListIds.size > 0
      ? new Map(
          (
            await prisma.clinicPriceOverride.findMany({
              where: {
                clinicId,
                priceListItemId: { in: [...priceListIds] },
              },
              select: { priceListItemId: true, priceRub: true },
            })
          ).map((x) => [x.priceListItemId, x.priceRub]),
        )
      : new Map<string, number>();

  if (materialIds.size > 0) {
    const mats = await prisma.material.findMany({
      where: { id: { in: [...materialIds] } },
      select: { id: true },
    });
    if (mats.length !== materialIds.size) {
      return {
        ok: false,
        err: { status: 400, error: "Указан неизвестный материал" },
      };
    }
  }

  for (let i = 0; i < items.length; i++) {
    const c = items[i];
    if (!c || typeof c !== "object") continue;

    const bf = trimOrNull(c.bridgeFromFdi);
    const bt = trimOrNull(c.bridgeToFdi);
    const shade = trimOrNull(c.shade);
    const qty = parseLineQuantity(c.quantity);
    const price = parseUnitPriceRub(c.unitPrice);
    const lineDiscountPercent = parseLineDiscountPercent(c.lineDiscountPercent);
    const materialId = trimOrNull(c.materialId);

    if (bf && bt) {
      if (!isValidPermanentFdi(bf) || !isValidPermanentFdi(bt)) {
        return {
          ok: false,
          err: {
            status: 400,
            error: `Некорректные границы моста по FDI: ${bf}–${bt}`,
          },
        };
      }
      const typeId = trimOrNull(c.constructionTypeId);
      creates.push({
        category: ConstructionCategory.BRIDGE,
        bridgeFromFdi: bf,
        bridgeToFdi: bt,
        quantity: qty,
        unitPrice: price,
        lineDiscountPercent,
        shade,
        materialId: materialId ?? undefined,
        constructionTypeId: typeId ?? undefined,
        sortOrder: i,
      });
      continue;
    }

    const plid = trimOrNull(c.priceListItemId);
    if (plid) {
      let unitPrice = price;
      if (unitPrice == null) {
        const rub = overridePriceByPlId.get(plid) ?? defaultPriceByPlId.get(plid);
        if (rub != null) unitPrice = rub;
      }
      let teethJson: string[] | undefined;
      if ("teethFdi" in c && Array.isArray(c.teethFdi)) {
        const teeth = c.teethFdi.map((x) => String(x));
        for (const tf of teeth) {
          if (!isValidPermanentFdi(tf)) {
            return {
              ok: false,
              err: {
                status: 400,
                error: `Некорректный номер зуба по FDI: ${tf}`,
              },
            };
          }
        }
        if (teeth.length > 0) {
          teethJson = teeth;
        }
      }
      let archVal: JawArch | undefined;
      if ("arch" in c && c.arch != null && c.arch !== "") {
        const a = String(c.arch);
        if (!JAW_ARCH_SET.has(a)) {
          return {
            ok: false,
            err: { status: 400, error: "Некорректное значение дуги (arch)" },
          };
        }
        archVal = a as JawArch;
      }
      creates.push({
        category: ConstructionCategory.PRICE_LIST,
        priceListItemId: plid,
        quantity: qty,
        unitPrice: unitPrice,
        lineDiscountPercent,
        ...(teethJson !== undefined ? { teethFdi: teethJson } : {}),
        ...(archVal !== undefined ? { arch: archVal } : {}),
        sortOrder: i,
      });
      continue;
    }

    const typeId = String(c.constructionTypeId ?? "").trim();
    const t = foundTypes.find((x) => x.id === typeId);
    if (!t) {
      return {
        ok: false,
        err: { status: 400, error: "Тип работы не найден" },
      };
    }

    if ("arch" in c && c.arch != null) {
      const a = String(c.arch);
      if (!JAW_ARCH_SET.has(a)) {
        return {
          ok: false,
          err: { status: 400, error: "Некорректное значение дуги (arch)" },
        };
      }
      creates.push({
        category: ConstructionCategory.ARCH,
        constructionTypeId: t.id,
        arch: a as JawArch,
        quantity: qty,
        unitPrice: price,
        lineDiscountPercent,
        shade,
        materialId: materialId ?? undefined,
        sortOrder: i,
      });
      continue;
    }

    if ("teethFdi" in c && Array.isArray(c.teethFdi)) {
      const teeth = c.teethFdi.map((x) => String(x));
      for (const tf of teeth) {
        if (!isValidPermanentFdi(tf)) {
          return {
            ok: false,
            err: {
              status: 400,
              error: `Некорректный номер зуба по FDI: ${tf}`,
            },
          };
        }
      }
      if (teeth.length === 0) continue;
      creates.push({
        category: ConstructionCategory.FIXED,
        constructionTypeId: t.id,
        teethFdi: teeth,
        quantity: qty,
        unitPrice: price,
        lineDiscountPercent,
        shade,
        materialId: materialId ?? undefined,
        sortOrder: i,
      });
      continue;
    }

    return {
      ok: false,
      err: {
        status: 400,
        error:
          "Каждая позиция: прайс (priceListItemId), зубы (teethFdi), дуга (arch) или мост (bridgeFromFdi + bridgeToFdi)",
      },
    };
  }

  return { ok: true, creates };
}
