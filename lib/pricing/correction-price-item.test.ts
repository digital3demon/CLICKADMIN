import { describe, expect, it } from "vitest";
import {
  CORRECTION_PRICE_ITEM_CODE,
  detailPriceListLabelLooksLikeCorrectionKp,
  draftPriceListRowIsCorrectionKp,
  sumCorrectionPriceLinesAllocatedRub,
} from "@/lib/pricing/correction-price-item";

describe("detailPriceListLabelLooksLikeCorrectionKp / draftPriceListRowIsCorrectionKp", () => {
  it("узнаёт подпись КП и строку черновика", () => {
    expect(detailPriceListLabelLooksLikeCorrectionKp("КП · Коррекция / переделка")).toBe(
      true,
    );
    expect(
      detailPriceListLabelLooksLikeCorrectionKp(
        '7117 · Дистализирующий аппарат на 2 мини импланта',
      ),
    ).toBe(false);
    expect(
      draftPriceListRowIsCorrectionKp({
        kind: "priceList",
        priceListCode: CORRECTION_PRICE_ITEM_CODE,
      }),
    ).toBe(true);
    expect(
      draftPriceListRowIsCorrectionKp({
        kind: "priceList",
        priceListCode: "7117",
      }),
    ).toBe(false);
  });
});

describe("sumCorrectionPriceLinesAllocatedRub", () => {
  it("суммирует только строки с кодом КП", () => {
    const rub = sumCorrectionPriceLinesAllocatedRub({
      isUrgent: false,
      urgentCoefficient: null,
      compositionDiscountPercent: 0,
      constructions: [
        {
          category: "PRICE_LIST",
          quantity: 1,
          unitPrice: 1000,
          lineDiscountPercent: 0,
          priceListItem: { code: CORRECTION_PRICE_ITEM_CODE },
        },
        {
          category: "PRICE_LIST",
          quantity: 1,
          unitPrice: 5000,
          lineDiscountPercent: 0,
          priceListItem: { code: "999" },
        },
      ],
    });
    expect(rub).toBe(1000);
  });

  it("суммирует несколько строк КП", () => {
    const rub = sumCorrectionPriceLinesAllocatedRub({
      isUrgent: false,
      urgentCoefficient: null,
      compositionDiscountPercent: 0,
      constructions: [
        {
          category: "PRICE_LIST",
          quantity: 1,
          unitPrice: 1000,
          lineDiscountPercent: 0,
          priceListItem: { code: CORRECTION_PRICE_ITEM_CODE },
        },
        {
          category: "PRICE_LIST",
          quantity: 2,
          unitPrice: 250,
          lineDiscountPercent: 0,
          priceListItem: { code: CORRECTION_PRICE_ITEM_CODE },
        },
        {
          category: "PRICE_LIST",
          quantity: 1,
          unitPrice: 700,
          lineDiscountPercent: 0,
          priceListItem: { code: "OTHER" },
        },
      ],
    });
    expect(rub).toBe(1500);
  });

  it("учитывает срочность", () => {
    const rub = sumCorrectionPriceLinesAllocatedRub({
      isUrgent: true,
      urgentCoefficient: 2,
      compositionDiscountPercent: 0,
      constructions: [
        {
          category: "PRICE_LIST",
          quantity: 1,
          unitPrice: 1000,
          lineDiscountPercent: 0,
          priceListItem: { code: CORRECTION_PRICE_ITEM_CODE },
        },
        {
          category: "PRICE_LIST",
          quantity: 1,
          unitPrice: 1000,
          lineDiscountPercent: 0,
          priceListItem: { code: "OTHER" },
        },
      ],
    });
    expect(rub).toBe(2000);
  });

  it("учитывает скидку на строку и общую скидку состава", () => {
    const rub = sumCorrectionPriceLinesAllocatedRub({
      isUrgent: false,
      urgentCoefficient: null,
      compositionDiscountPercent: 10,
      constructions: [
        {
          category: "PRICE_LIST",
          quantity: 1,
          unitPrice: 1000,
          lineDiscountPercent: 50,
          priceListItem: { code: CORRECTION_PRICE_ITEM_CODE },
        },
        {
          category: "PRICE_LIST",
          quantity: 1,
          unitPrice: 500,
          lineDiscountPercent: 0,
          priceListItem: { code: "OTHER" },
        },
      ],
    });
    expect(rub).toBe(450);
  });

  it("игнорирует не-прайсовые строки даже с кодом КП", () => {
    const rub = sumCorrectionPriceLinesAllocatedRub({
      isUrgent: false,
      urgentCoefficient: null,
      compositionDiscountPercent: 0,
      constructions: [
        {
          category: "FIXED",
          quantity: 1,
          unitPrice: 1000,
          lineDiscountPercent: 0,
          priceListItem: { code: CORRECTION_PRICE_ITEM_CODE },
        },
        {
          category: "PRICE_LIST",
          quantity: 1,
          unitPrice: 500,
          lineDiscountPercent: 0,
          priceListItem: { code: "OTHER" },
        },
      ],
    });
    expect(rub).toBe(0);
  });

  it("возвращает 0 при нулевой сумме состава", () => {
    const rub = sumCorrectionPriceLinesAllocatedRub({
      isUrgent: true,
      urgentCoefficient: 2,
      compositionDiscountPercent: 0,
      constructions: [
        {
          category: "PRICE_LIST",
          quantity: 1,
          unitPrice: 0,
          lineDiscountPercent: 0,
          priceListItem: { code: CORRECTION_PRICE_ITEM_CODE },
        },
        {
          category: "PRICE_LIST",
          quantity: 1,
          unitPrice: 0,
          lineDiscountPercent: 0,
          priceListItem: { code: "OTHER" },
        },
      ],
    });
    expect(rub).toBe(0);
  });
});
