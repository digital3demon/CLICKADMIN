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
  dedupeCompositionHintsBySiblingVariants,
  isPriceNameStrictlyMoreSpecific,
  areSiblingPriceNameVariants,
  extractNegatedOrderPhrases,
  isPriceConceptNegatedInOrderText,
  filterCompositionHintsByNegation,
  filterCompositionHintsByOrderTextEvidence,
  hasOrderTextEvidenceForPriceHint,
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
    id: "pli-5b",
    code: "005b",
    name: "Аппарат Марко Росса/HAAS",
    priceRub: 15000,
    leadWorkingDays: 10,
    sortOrder: 5,
    isActive: true,
    priceListId: "pl-1",
  },
  {
    id: "pli-snore",
    code: "3300",
    name: "Аппарат для лечения храпа",
    priceRub: 33000,
    leadWorkingDays: 14,
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
  {
    id: "pli-model",
    code: "5001",
    name: "Модель неразборная/диагностическая",
    priceRub: 3500,
    leadWorkingDays: 3,
    sortOrder: 8,
    isActive: true,
    priceListId: "pl-1",
  },
  {
    id: "pli-key",
    code: "4002",
    name: "Силиконовый ключ (1 печатной модели)",
    priceRub: 1200,
    leadWorkingDays: 2,
    sortOrder: 9,
    isActive: true,
    priceListId: "pl-1",
  },
  {
    id: "pli-immediate-screw",
    code: "6015",
    name: "Немедленная нагрузка на винтовой фиксации",
    priceRub: 5000,
    leadWorkingDays: 5,
    sortOrder: 10,
    isActive: true,
    priceListId: "pl-1",
  },
  {
    id: "pli-titan-base",
    code: "6006",
    name: "Титановое основание Ультрастом",
    priceRub: 650,
    leadWorkingDays: 3,
    sortOrder: 11,
    isActive: true,
    priceListId: "pl-1",
  },
  {
    id: "pli-immediate-reinf",
    code: "6016",
    name: "Немедленная нагрузка с армированием",
    priceRub: 55000,
    leadWorkingDays: 7,
    sortOrder: 12,
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

  it("drops silicone key when order text says bez klyucha", async () => {
    const orderText = "Модель 2 сектора без ключа";
    const res = await resolveAiCompositionLines(
      [
        { nameHint: "Модель неразборная/диагностическая", quantity: 1 },
        { nameHint: "Силиконовый ключ", quantity: 1 },
      ],
      { clinicId: null, doctorId: null, negationOrderText: orderText },
    );
    expect(res.lines).toHaveLength(1);
    expect(res.lines[0]?.code).toBe("5001");
  });

  it("keeps screw immediate loading and titanium base, drops sibling variant", async () => {
    const orderText =
      "немедленная нагрузка на винтовой фиксации, титановое основание ультрастом, 63 детали";
    const res = await resolveAiCompositionLines(
      [
        { nameHint: "Немедленная нагрузка на винтовой фиксации", quantity: 1 },
        { nameHint: "Титановое основание Ультрастом", quantity: 1 },
        { nameHint: "Немедленная нагрузка с армированием", quantity: 1 },
      ],
      { clinicId: null, doctorId: null, negationOrderText: orderText },
    );
    expect(res.lines.map((line) => line.code).sort()).toEqual(["6006", "6015"]);
  });

  it("prefers cheaper immediate loading when order text is ambiguous", async () => {
    const orderText = "немедленная нагрузка, 63 детали";
    const res = await resolveAiCompositionLines(
      [
        { nameHint: "Немедленная нагрузка на винтовой фиксации", quantity: 1 },
        { nameHint: "Немедленная нагрузка с армированием", quantity: 1 },
      ],
      { clinicId: null, doctorId: null, negationOrderText: orderText },
    );
    expect(res.lines).toHaveLength(1);
    expect(res.lines[0]?.code).toBe("6015");
    expect(res.lines[0]?.unitPrice).toBe(5000);
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

describe("sibling price name variants", () => {
  it("detects immediate loading variants as siblings", () => {
    expect(
      areSiblingPriceNameVariants(
        "Немедленная нагрузка на винтовой фиксации",
        "Немедленная нагрузка с армированием",
      ),
    ).toBe(true);
    expect(
      areSiblingPriceNameVariants(
        "Немедленная нагрузка на винтовой фиксации",
        "Титановое основание Ультрастом",
      ),
    ).toBe(false);
  });

  it("dedupes sibling hints by order text", () => {
    const orderText = "немедленная нагрузка на винтовой фиксации, титановое основание";
    expect(
      dedupeCompositionHintsBySiblingVariants(
        [
          { nameHint: "Немедленная нагрузка на винтовой фиксации", quantity: 1 },
          { nameHint: "Титановое основание Ультрастом", quantity: 1 },
          { nameHint: "Немедленная нагрузка с армированием", quantity: 1 },
        ],
        orderText,
      ).map((hint) => hint.nameHint),
    ).toEqual([
      "Немедленная нагрузка на винтовой фиксации",
      "Титановое основание Ультрастом",
    ]);
  });

  it("prefers cheaper sibling when order text is ambiguous", async () => {
    const orderText = "немедленная нагрузка, титановое основание ультрастом";
    const res = await resolveAiCompositionLines(
      [
        { nameHint: "Немедленная нагрузка на винтовой фиксации", quantity: 1 },
        { nameHint: "Немедленная нагрузка с армированием", quantity: 1 },
        { nameHint: "Титановое основание Ультрастом", quantity: 1 },
      ],
      { clinicId: null, doctorId: null, negationOrderText: orderText },
    );
    expect(res.lines.map((line) => line.code).sort()).toEqual(["6006", "6015"]);
    expect(res.lines.find((line) => line.code === "6015")?.unitPrice).toBe(5000);
  });
});

describe("order negation phrases", () => {
  const orderText = "Модель 2 сектора без ключа";

  it("extracts negated phrase", () => {
    expect(extractNegatedOrderPhrases(orderText)).toEqual(["ключа"]);
  });

  it("marks silicone key as negated but keeps model", () => {
    expect(isPriceConceptNegatedInOrderText("Силиконовый ключ (1 печатной модели)", orderText)).toBe(
      true,
    );
    expect(isPriceConceptNegatedInOrderText("Модель неразборная/диагностическая", orderText)).toBe(
      false,
    );
  });

  it("infers only model from order text with negation", () => {
    const names = mockItems.map((item) => item.name);
    expect(inferCompositionHintsFromOrderText(orderText, names)).toEqual([
      { nameHint: "Модель неразборная/диагностическая", quantity: 1 },
    ]);
  });

  it("filters negated hints", () => {
    expect(
      filterCompositionHintsByNegation(
        [
          { nameHint: "Модель неразборная/диагностическая", quantity: 1 },
          { nameHint: "Силиконовый ключ", quantity: 1 },
        ],
        orderText,
      ),
    ).toEqual([{ nameHint: "Модель неразборная/диагностическая", quantity: 1 }]);
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
      { nameHint: "Аппарат Марко Росса/HAAS", quantity: 1 },
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
    ).toEqual([{ nameHint: "Аппарат Марко Росса/HAAS", quantity: 1 }]);
  });

  it("matches typo rosa vs rossa in price list name", async () => {
    const res = await resolveAiCompositionLines(
      [{ nameHint: "марко роса", quantity: 1 }],
      { clinicId: null, doctorId: null, negationOrderText: "марко роса" },
    );
    expect(res.lines).toHaveLength(1);
    expect(res.lines[0].code).toBe("005b");
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
    expect(inferredOnly.lines[0].code).toBe("005b");
  });
});

const remiKidsOrderText =
  "аппарат Марко Роса с опорой на 53, 55, 63, 65, титановый + крючки для лицевой маски";

describe("Marco Rosa titanium and hallucination guard", () => {
  it("rejects snoring hint without evidence in order text", () => {
    expect(hasOrderTextEvidenceForPriceHint("Аппарат для лечения храпа", remiKidsOrderText)).toBe(
      false,
    );
    expect(
      filterCompositionHintsByOrderTextEvidence(
        [
          { nameHint: "Аппарат Марко Росса/HAAS", quantity: 1 },
          { nameHint: "Аппарат для лечения храпа", quantity: 1 },
        ],
        remiKidsOrderText,
      ),
    ).toEqual([{ nameHint: "Аппарат Марко Росса/HAAS", quantity: 1 }]);
  });

  it("resolves titanium Marco Rosa when order text says титановый", async () => {
    const res = await resolveAiCompositionLines(
      [
        { nameHint: "Аппарат Марко Росса/HAAS", quantity: 1 },
        { nameHint: "Аппарат для лечения храпа", quantity: 1 },
      ],
      { clinicId: null, doctorId: null, negationOrderText: remiKidsOrderText },
    );
    expect(res.lines).toHaveLength(1);
    expect(res.lines[0]?.code).toBe("005");
    expect(res.lines[0]?.name).toContain("титан");
    expect(res.lines[0]?.teethFdi).toEqual(["53", "55", "63", "65"]);
  });

  it("infers titanium variant from full Remi Kids order text", () => {
    const names = mockItems.map((item) => item.name);
    expect(inferCompositionHintsFromOrderText(remiKidsOrderText, names)).toEqual([
      { nameHint: "Аппарат Марко Росса/HAAS титан", quantity: 1 },
    ]);
  });
});
