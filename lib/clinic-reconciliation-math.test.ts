import { describe, expect, it } from "vitest";
import {
  aggregateReconciliationSummaryWithoutDiscount,
  groupReconciliationDetailRows,
  modeNonEmptyLabel,
  reconciliationVatIncluded5,
} from "@/lib/clinic-reconciliation-math";

describe("reconciliationVatIncluded5", () => {
  it("считает НДС внутри цены ×5/105", () => {
    expect(reconciliationVatIncluded5(10500)).toBe(500);
    expect(reconciliationVatIncluded5(2100)).toBe(100);
  });

  it("на нуле и отрицательном — 0", () => {
    expect(reconciliationVatIncluded5(0)).toBe(0);
    expect(reconciliationVatIncluded5(-10)).toBe(0);
  });
});

describe("aggregateReconciliationSummaryWithoutDiscount", () => {
  it("склеивает одинаковые позиции с одной ценой по baseTotal", () => {
    const rows = aggregateReconciliationSummaryWithoutDiscount([
      {
        label: "3102 Коронка",
        quantity: 1,
        unitRub: 5000,
        baseTotalRub: 5000,
      },
      {
        label: "3102 Коронка",
        quantity: 2,
        unitRub: 5000,
        baseTotalRub: 10000,
      },
      {
        label: "3102 Коронка",
        quantity: 1,
        unitRub: 4000,
        baseTotalRub: 4000,
      },
    ]);
    expect(rows).toHaveLength(2);
    const a = rows.find((r) => r.unitRub === 5000)!;
    expect(a.quantity).toBe(3);
    expect(a.totalRub).toBe(15000);
    const b = rows.find((r) => r.unitRub === 4000)!;
    expect(b.quantity).toBe(1);
    expect(b.totalRub).toBe(4000);
  });
});

describe("modeNonEmptyLabel", () => {
  it("берёт модальную метку", () => {
    expect(modeNonEmptyLabel(["ООО", "ИП", "ООО", "", null])).toBe("ООО");
  });
});

describe("groupReconciliationDetailRows (вариант B)", () => {
  it("начинает новую группу на showOrderColumns", () => {
    const groups = groupReconciliationDetailRows([
      { showOrderColumns: true, id: "1" },
      { showOrderColumns: false, id: "2" },
      { showOrderColumns: true, id: "3" },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveLength(2);
    expect(groups[1]).toHaveLength(1);
    expect(groups[0]![0]!.id).toBe("1");
    expect(groups[1]![0]!.id).toBe("3");
  });
});
