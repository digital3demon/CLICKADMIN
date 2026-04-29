import type { JawArch } from "@prisma/client";
import type { BridgeLineInput } from "@/lib/detail-lines-to-constructions";
import type { DetailLine } from "@/components/orders/new-order-form/detail-lines";

type ConstructionIn = {
  id: string;
  category: string;
  constructionTypeId: string | null;
  teethFdi: unknown;
  bridgeFromFdi: string | null;
  bridgeToFdi: string | null;
  arch: JawArch | null;
  quantity: number;
  unitPrice: number | null;
  materialId: string | null;
  shade: string | null;
};

/** Разбор позиций БД во вкладку «Состав» (новый наряд) + мосты */
export function constructionsToDetailAndBridges(
  rows: ConstructionIn[],
): { detailLines: DetailLine[]; bridgeLines: BridgeLineInput[] } {
  const detailLines: DetailLine[] = [];
  const bridgeLines: BridgeLineInput[] = [];

  for (const c of rows) {
    if (
      c.category === "BRIDGE" &&
      c.bridgeFromFdi &&
      c.bridgeToFdi
    ) {
      bridgeLines.push({
        bridgeFromFdi: c.bridgeFromFdi,
        bridgeToFdi: c.bridgeToFdi,
        constructionTypeId: c.constructionTypeId,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        materialId: c.materialId,
        shade: c.shade,
      });
      continue;
    }

    if (
      c.category === "ARCH" &&
      c.constructionTypeId &&
      c.arch
    ) {
      detailLines.push({
        id: c.id,
        kind: "arch",
        constructionTypeId: c.constructionTypeId,
        arch: c.arch,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        materialId: c.materialId,
        shade: c.shade,
      });
      continue;
    }

    if (
      (c.category === "FIXED" ||
        c.category === "MISSING_TEETH" ||
        c.category === "CONNECTING") &&
      c.constructionTypeId &&
      Array.isArray(c.teethFdi) &&
      c.teethFdi.length > 0
    ) {
      detailLines.push({
        id: c.id,
        kind: "teeth",
        constructionTypeId: c.constructionTypeId,
        teethFdi: c.teethFdi.map((x) => String(x)),
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        materialId: c.materialId,
        shade: c.shade,
      });
    }
  }

  return { detailLines, bridgeLines };
}
