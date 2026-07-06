import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma-pricing", () => ({
  getPricingPrismaClient: vi.fn(),
}));

vi.mock("@/lib/price-list-workspace", () => ({
  getActivePriceListId: vi.fn().mockResolvedValue("pl-1"),
}));

vi.mock("@/lib/price-overrides", () => ({
  resolvePriceOverrideMap: vi.fn().mockResolvedValue(new Map()),
}));

import { getPricingPrismaClient } from "@/lib/prisma-pricing";
import { resolveAiCompositionLines } from "./resolve-ai-composition-lines";

const mockItems = [
  {
    id: "pli-1",
    code: "001",
    name: "Аппарат Андрезена",
    priceRub: 12000,
    leadWorkingDays: 5,
    sortOrder: 1,
    isActive: true,
    priceListId: "pl-1",
  },
  {
    id: "pli-2",
    code: "002",
    name: "Коронка Emax",
    priceRub: 8000,
    leadWorkingDays: 3,
    sortOrder: 2,
    isActive: true,
    priceListId: "pl-1",
  },
  {
    id: "pli-3",
    code: "003",
    name: "Коронка Emax премиум",
    priceRub: 8000,
    leadWorkingDays: 3,
    sortOrder: 3,
    isActive: true,
    priceListId: "pl-1",
  },
  {
    id: "pli-4",
    code: "7208",
    name: "Каппа ретенционная\\элайнер",
    priceRub: 5000,
    leadWorkingDays: 5,
    sortOrder: 4,
    isActive: true,
    priceListId: "pl-1",
  },
];

describe("resolveAiCompositionLines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPricingPrismaClient).mockReturnValue({
      priceListItem: {
        findMany: vi.fn().mockResolvedValue(mockItems),
      },
    } as never);
  });

  it("matches exact price list item by nameHint", async () => {
    const res = await resolveAiCompositionLines(
      [{ nameHint: "Аппарат Андрезена", quantity: 1 }],
      { clinicId: "clinic-1", doctorId: "doctor-1" },
    );
    expect(res.lines).toHaveLength(1);
    expect(res.lines[0].name).toBe("Аппарат Андрезена");
    expect(res.lines[0].unitPrice).toBe(12000);
    expect(res.maxLeadWorkingDays).toBe(5);
    expect(res.warnings).toHaveLength(0);
  });

  it("resolves fuzzy hint to price list item", async () => {
    const res = await resolveAiCompositionLines(
      [{ nameHint: "андрезен" }],
      { clinicId: null, doctorId: "doctor-1" },
    );
    expect(res.lines).toHaveLength(1);
    expect(res.lines[0].priceListItemId).toBe("pli-1");
  });

  it("picks first candidate when ambiguous but same price", async () => {
    const res = await resolveAiCompositionLines(
      [{ nameHint: "коронка emax" }],
      { clinicId: null, doctorId: null },
    );
    expect(res.lines).toHaveLength(1);
    expect(res.lines[0].unitPrice).toBe(8000);
    expect(res.warnings).toHaveLength(0);
  });

  it("matches retention capa VCH/NCH as one price item qty 2", async () => {
    const res = await resolveAiCompositionLines(
      [
        { nameHint: "Ретенционная капа ВЧ", quantity: 1 },
        { nameHint: "Ретенционная капа НЧ", quantity: 1 },
      ],
      { clinicId: null, doctorId: null },
    );
    expect(res.lines).toHaveLength(1);
    expect(res.lines[0].code).toBe("7208");
    expect(res.lines[0].quantity).toBe(2);
    expect(res.warnings).toHaveLength(0);
  });

  it("matches reversed word order like retainer kappa", async () => {
    const res = await resolveAiCompositionLines(
      [{ nameHint: "Ретенционная каппа", quantity: 1 }],
      { clinicId: null, doctorId: null },
    );
    expect(res.lines).toHaveLength(1);
    expect(res.lines[0].code).toBe("7208");
    expect(res.warnings).toHaveLength(0);
  });

  it("warns when hint cannot be matched", async () => {
    const res = await resolveAiCompositionLines(
      [{ nameHint: "несуществующая работа XYZ" }],
      { clinicId: null, doctorId: null },
    );
    expect(res.lines).toHaveLength(0);
    expect(res.warnings.some((w) => w.includes("Не найдено в прайсе"))).toBe(true);
  });
});
