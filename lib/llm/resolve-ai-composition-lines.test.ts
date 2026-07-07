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
import {
  resolveAiCompositionLines,
  inferCompositionHintsFromOrderText,
  inferCompositionHintsFromEmailContext,
  dedupeCompositionHintsBySpecificity,
  isPriceNameStrictlyMoreSpecific,
} from "./resolve-ai-composition-lines";

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
  {
    id: "pli-5",
    code: "005",
    name: "Аппарат Марко Росса/HAAS титан",
    priceRub: 19000,
    leadWorkingDays: 10,
    sortOrder: 5,
    isActive: true,
    priceListId: "pl-1",
  },
  {
    id: "pli-splint-simple",
    code: "1001",
    name: "Сплинт",
    priceRub: 4000,
    leadWorkingDays: 5,
    sortOrder: 6,
    isActive: true,
    priceListId: "pl-1",
  },
  {
    id: "pli-splint-complex",
    code: "1001",
    name: "Сплинт сложный",
    priceRub: 19000,
    leadWorkingDays: 7,
    sortOrder: 7,
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

  it("merges jaw-split hints into one price line", async () => {
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

  it("merges accusative jaw phrases into one price line", async () => {
    const res = await resolveAiCompositionLines(
      [
        { nameHint: "Ретенционная каппа на верхнюю челюсть", quantity: 1 },
        { nameHint: "Ретенционная каппа на нижнюю челюсть", quantity: 1 },
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

  it("drops generic splint when specific splint is also hinted", async () => {
    const res = await resolveAiCompositionLines(
      [
        { nameHint: "Сплинт сложный", quantity: 1 },
        { nameHint: "Сплинт", quantity: 1 },
      ],
      { clinicId: null, doctorId: null },
    );
    expect(res.lines).toHaveLength(1);
    expect(res.lines[0]?.name).toBe("Сплинт сложный");
    expect(res.lines[0]?.unitPrice).toBe(19000);
  });
});

describe("dedupeCompositionHintsBySpecificity", () => {
  it("recognizes specific splint name", () => {
    expect(isPriceNameStrictlyMoreSpecific("Сплинт сложный", "Сплинт")).toBe(true);
    expect(isPriceNameStrictlyMoreSpecific("Сплинт", "Сплинт сложный")).toBe(false);
  });

  it("removes generic duplicate hints", () => {
    expect(
      dedupeCompositionHintsBySpecificity([
        { nameHint: "Сплинт", quantity: 1 },
        { nameHint: "Сплинт сложный", quantity: 1 },
      ]),
    ).toEqual([{ nameHint: "Сплинт сложный", quantity: 1 }]);
  });
});

describe("inferCompositionHintsFromOrderText", () => {
  const names = mockItems.map((item) => item.name);

  it("infers price item from order text when hints are empty", () => {
    expect(
      inferCompositionHintsFromOrderText(
        "необходимо изготовить ретенционные капы на ВЧ и НЧ",
        names,
      ),
    ).toEqual([{ nameHint: "Каппа ретенционная\\элайнер", quantity: 2 }]);
  });

  it("returns empty when no catalog item matches", () => {
    expect(inferCompositionHintsFromOrderText("просто осмотр", names)).toEqual([]);
  });

  it("prefers apparatus over crown when order text is only marco rosa", () => {
    const extendedNames = [
      ...names,
      "Корона из циркония Marco Rosa (многослойный)",
    ];
    expect(inferCompositionHintsFromOrderText("марко роса", extendedNames)).toEqual([
      { nameHint: "Аппарат Марко Росса/HAAS титан", quantity: 1 },
    ]);
  });
});

describe("inferCompositionHintsFromEmailContext", () => {
  const names = mockItems.map((item) => item.name);

  it("finds Marco Rosa in comma-separated email subject", () => {
    expect(
      inferCompositionHintsFromEmailContext(
        {
          clientOrderText: "марко росса",
          emailSubject: "вр Федорова пац Беляев Иван, марко росса, Чкаловский 50",
        },
        names,
      ),
    ).toEqual([{ nameHint: "Аппарат Марко Росса/HAAS титан", quantity: 1 }]);
  });

  it("matches typo rosa vs rossa in price list name", async () => {
    const res = await resolveAiCompositionLines(
      [{ nameHint: "марко роса", quantity: 1 }],
      { clinicId: null, doctorId: null },
    );
    expect(res.lines).toHaveLength(1);
    expect(res.lines[0].code).toBe("005");
  });

  it("ignores hallucinated AI hint when marco rosa maps to apparatus", async () => {
    const inferred = inferCompositionHintsFromEmailContext(
      {
        clientOrderText: "марко роса",
        emailSubject: "вр Федорова пац Беляев Иван, марко росса, Чкаловский 50",
      },
      mockItems.map((item) => item.name),
    );
    expect(inferred).toHaveLength(1);

    const aiHints = [
      { nameHint: "Корона из циркония Marco Rosa (многослойный)", quantity: 1 },
    ];
    const aiOnly = await resolveAiCompositionLines(aiHints, { clinicId: null, doctorId: null });
    const inferredOnly = await resolveAiCompositionLines(inferred, {
      clinicId: null,
      doctorId: null,
    });
    expect(aiOnly.lines).toHaveLength(0);
    expect(inferredOnly.lines).toHaveLength(1);
    expect(inferredOnly.lines[0].code).toBe("005");
  });
});
