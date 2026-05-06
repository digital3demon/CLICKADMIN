import { CORRECTION_PRICE_ITEM_CODE } from "@/lib/pricing/correction-price-item";

export type CorrectionPriceListMeta = {
  id: string;
  code: string;
  name: string;
  priceRub: number;
};

/** Позиция прайса «КП» для строки «Коррекция / переделка» (активный каталог). */
export async function fetchCorrectionPriceListMeta(opts?: {
  clinicId?: string | null;
  doctorId?: string | null;
}): Promise<CorrectionPriceListMeta | null> {
  try {
    const params = new URLSearchParams();
    const cid = opts?.clinicId?.trim();
    const did = opts?.doctorId?.trim();
    if (cid) params.set("clinicId", cid);
    if (did) params.set("doctorId", did);
    const q = params.toString();
    const url = q ? `/api/price-list-items?${q}` : "/api/price-list-items";
    const res = await fetch(url);
    if (!res.ok) return null;
    const items = (await res.json()) as CorrectionPriceListMeta[];
    return (
      items.find((x) => x.code.trim() === CORRECTION_PRICE_ITEM_CODE) ?? null
    );
  } catch {
    return null;
  }
}
