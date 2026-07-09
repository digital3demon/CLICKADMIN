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
  isGumIndividualizationHallucination,
  isGeoBaseFromScanMarkerHallucination,
  ensurePmmaCompositionHints,
  orderTextMentionsPmmaTemporaryCrown,
  orderTextImpliesScrewRetainedTempCrown,
  pickPmmaCrownPriceListName,
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
    id: "pli-temp-crown",
    code: "3101",
    name: "Временная коронка композитная",
    priceRub: 5500,
    leadWorkingDays: 3,
    sortOrder: 9,
    isActive: true,
    priceListId: "pl-1",
  },
  {
    id: "pli-temp-crown-screw",
    code: "3112",
    name: "Временная коронка принт/фрез на винтовой фиксации",
    priceRub: 6500,
    leadWorkingDays: 4,
    sortOrder: 10,
    isActive: true,
    priceListId: "pl-1",
  },
  {
    id: "pli-immediate-screw",
    code: "6015",
    name: "Немедленная нагрузка на винтовой фиксации",
    priceRub: 5000,
    leadWorkingDays: 5,
    sortOrder: 11,
    isActive: true,
    priceListId: "pl-1",
  },
  {
    id: "pli-gum",
    code: "3104",
    name: "Индивидуализация десны на РММА 1 челюсть",
    priceRub: 3104,
    leadWorkingDays: 3,
    sortOrder: 12,
    isActive: true,
    priceListId: "pl-1",
  },
  {
    id: "pli-titan-base",
    code: "6006",
    name: "Титановое основание Ультрастом",
    priceRub: 650,
    leadWorkingDays: 3,
    sortOrder: 13,
    isActive: true,
    priceListId: "pl-1",
  },
  {
    id: "pli-geo-base",
    code: "6007",
    name: "Титановое основание ГЕО",
    priceRub: 3200,
    leadWorkingDays: 3,
    sortOrder: 14,
    isActive: true,
    priceListId: "pl-1",
  },
  {
    id: "pli-analog-ultra",
    code: "6008",
    name: "Аналог Ультрастом",
    priceRub: 1000,
    leadWorkingDays: 2,
    sortOrder: 15,
    isActive: true,
    priceListId: "pl-1",
  },
  {
    id: "pli-immediate-reinf",
    code: "6016",
    name: "Немедленная нагрузка с армированием",
    priceRub: 55000,
    leadWorkingDays: 7,
    sortOrder: 16,
    isActive: true,
    priceListId: "pl-1",
  },
];

const pmmaOrderText = [
  "Вид работы: 12-22, 24 ПММА, А3,5",
  "12-22 Astra EV, MIO Ультрастом, скан-маркеры Ультрастом",
  "24 Astra EV 3,6, Гео длинный скан-маркер",
  "Основания Ультрастом",
].join("\n");

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

const kappaTrimOrderText =
  "ретенционная капа на вч, обрезка не заходя десну чтобы заканчивалась на зубах";

describe("kappa trim instructions vs gum individualization", () => {
  it("treats gum mention in trim context as hallucination", () => {
    expect(
      isGumIndividualizationHallucination(
        "Индивидуализация десны на РММА 1 челюсть",
        kappaTrimOrderText,
      ),
    ).toBe(true);
    expect(
      hasOrderTextEvidenceForPriceHint(
        "Индивидуализация десны на РММА 1 челюсть",
        kappaTrimOrderText,
      ),
    ).toBe(false);
  });

  it("keeps only kappa when AI adds gum individualization", async () => {
    const res = await resolveAiCompositionLines(
      [
        { nameHint: "Индивидуализация десны на РММА 1 челюсть", quantity: 1 },
        { nameHint: "Каппа ретенционная\\элайнер", quantity: 1 },
      ],
      { clinicId: null, doctorId: null, negationOrderText: kappaTrimOrderText },
    );
    expect(res.lines).toHaveLength(1);
    expect(res.lines[0]?.code).toBe("7208");
  });

  it("does not infer gum individualization from trim-only order text", () => {
    const names = mockItems.map((item) => item.name);
    expect(inferCompositionHintsFromOrderText(kappaTrimOrderText, names)).toEqual([
      { nameHint: "Каппа ретенционная\\элайнер", quantity: 1 },
    ]);
  });
});

describe("PMMA temporary crown + Ultrastom bases", () => {
  const names = mockItems.map((item) => item.name);
  const teeth5 = ["12", "11", "21", "22", "24"];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPricingPrismaClient).mockReturnValue({
      priceListItem: {
        findMany: vi.fn().mockResolvedValue(mockItems),
      },
    } as never);
  });

  it("detects ПММА as temporary crown synonym", () => {
    expect(orderTextMentionsPmmaTemporaryCrown(pmmaOrderText)).toBe(true);
    expect(orderTextMentionsPmmaTemporaryCrown("индивидуализация десны на РММА")).toBe(false);
  });

  it("rejects GEO base when Гео only names a scan marker", () => {
    expect(
      isGeoBaseFromScanMarkerHallucination("Титановое основание ГЕО", pmmaOrderText),
    ).toBe(true);
    expect(hasOrderTextEvidenceForPriceHint("Титановое основание ГЕО", pmmaOrderText)).toBe(
      false,
    );
  });

  it("implies screw-retained from scan markers / bases / phrase, not from ПММА alone", () => {
    expect(orderTextImpliesScrewRetainedTempCrown(pmmaOrderText)).toBe(true);
    expect(orderTextImpliesScrewRetainedTempCrown("Вид работы: 12-22 ПММА, А3")).toBe(false);
    expect(
      orderTextImpliesScrewRetainedTempCrown("ПММА на винтовой фиксации, зуб 24"),
    ).toBe(true);
    expect(
      orderTextImpliesScrewRetainedTempCrown("ПММА, титановые основания, зуб 24"),
    ).toBe(true);
    expect(orderTextImpliesScrewRetainedTempCrown("ПММА, скан-маркеры")).toBe(true);
  });

  it("does not treat ПММА alone as evidence for immediate loading", () => {
    expect(
      hasOrderTextEvidenceForPriceHint(
        "Немедленная нагрузка на винтовой фиксации",
        pmmaOrderText,
      ),
    ).toBe(false);
    expect(
      hasOrderTextEvidenceForPriceHint(
        "Временная коронка принт/фрез на винтовой фиксации",
        pmmaOrderText,
      ),
    ).toBe(true);
    expect(
      hasOrderTextEvidenceForPriceHint(
        "Временная коронка принт/фрез на винтовой фиксации",
        "Вид работы: 12-22 ПММА, А3",
      ),
    ).toBe(false);
  });

  it("picks crown name only from active price list (no invented labels)", () => {
    expect(pickPmmaCrownPriceListName(names, pmmaOrderText)).toBe(
      "Временная коронка принт/фрез на винтовой фиксации",
    );
    expect(pickPmmaCrownPriceListName(names, "Вид работы: 12 ПММА")).toBe(
      "Временная коронка композитная",
    );
    expect(pickPmmaCrownPriceListName(["Аппарат Андрезена"], pmmaOrderText)).toBeNull();
  });

  it("ensures screw temp crown + base matched from text brand when markers/bases present", () => {
    const ensured = ensurePmmaCompositionHints(
      [
        { nameHint: "Немедленная нагрузка на винтовой фиксации", quantity: 1 },
        { nameHint: "Титановое основание ГЕО", quantity: 1 },
        { nameHint: "Аналог Ультрастом", quantity: 1 },
      ],
      pmmaOrderText,
      names,
    );
    expect(ensured.some((h) => /немедленн/i.test(h.nameHint))).toBe(false);
    const crown = ensured.find((h) => /временн/i.test(h.nameHint) && /коронк/i.test(h.nameHint));
    const base = ensured.find((h) => /основан/i.test(h.nameHint));
    expect(crown?.nameHint).toBe("Временная коронка принт/фрез на винтовой фиксации");
    expect(crown?.quantity).toBe(1);
    expect(crown?.teethFdi).toEqual(["12", "11", "21", "22"]);
    const crown24 = ensured.filter(
      (h) =>
        /временн/i.test(h.nameHint) &&
        /коронк/i.test(h.nameHint) &&
        h.teethFdi?.includes("24"),
    );
    expect(crown24).toHaveLength(1);
    expect(crown24[0]?.quantity).toBe(1);
    expect(base?.nameHint).toMatch(/ультрастом/i);
    expect(base?.quantity).toBe(5);
    expect(base?.teethFdi).toEqual(teeth5);
  });

  it("uses plain temporary crown from price list when ПММА without screw signals", () => {
    const plainText = "Вид работы: 12-22, 24 ПММА, А3,5";
    const ensured = ensurePmmaCompositionHints([], plainText, names);
    expect(ensured).toEqual([
      {
        nameHint: "Временная коронка композитная",
        quantity: 1,
        teethFdi: ["12", "11", "21", "22"],
      },
      {
        nameHint: "Временная коронка композитная",
        quantity: 1,
        teethFdi: ["24"],
      },
    ]);
  });

  it("does not invent crown when price list has no temporary crown", () => {
    const ensured = ensurePmmaCompositionHints(
      [],
      "Вид работы: 12 ПММА, скан-маркеры",
      ["Аппарат Андрезена", "Титановое основание Ультрастом"],
    );
    expect(ensured.some((h) => /коронк|пмма|pmma/i.test(h.nameHint))).toBe(false);
  });

  it("matches GEO base when text says основания ГЕО (any brand from text)", () => {
    const geoText = "Вид работы: 24 ПММА\nОснования ГЕО, скан-маркер";
    const ensured = ensurePmmaCompositionHints([], geoText, names);
    expect(
      ensured.some((h) => h.nameHint === "Временная коронка принт/фрез на винтовой фиксации"),
    ).toBe(true);
    expect(ensured.some((h) => /основан/i.test(h.nameHint) && /гео/i.test(h.nameHint))).toBe(
      true,
    );
  });

  it("resolves PMMA+markers order to screw crown ×5 and text-matched base ×5", async () => {
    const hints = ensurePmmaCompositionHints(
      filterCompositionHintsByOrderTextEvidence(
        [
          { nameHint: "Титановое основание ГЕО", quantity: 1 },
          { nameHint: "Аналог Ультрастом", quantity: 1 },
        ],
        pmmaOrderText,
      ),
      pmmaOrderText,
      names,
    );
    const res = await resolveAiCompositionLines(hints, {
      clinicId: null,
      doctorId: null,
      negationOrderText: pmmaOrderText,
    });
    const byCode = Object.fromEntries(res.lines.map((l) => [l.code, l]));
    const crowns = res.lines.filter((l) => l.code === "3112");
    expect(crowns).toHaveLength(2);
    expect(crowns.map((l) => l.teethFdi).sort((a, b) => a.join().localeCompare(b.join()))).toEqual(
      [["12", "11", "21", "22"], ["24"]].sort((a, b) => a.join().localeCompare(b.join())),
    );
    expect(crowns.every((l) => l.quantity === 1)).toBe(true);
    expect(byCode["6006"]?.quantity).toBe(5);
    expect(byCode["3101"]).toBeUndefined();
    expect(byCode["6015"]).toBeUndefined();
    expect(byCode["6007"]).toBeUndefined();
  });

  it("infers screw PMMA crown from email context when markers/bases present", () => {
    const inferred = inferCompositionHintsFromEmailContext(
      { clientOrderText: pmmaOrderText },
      names,
    );
    expect(
      inferred.some(
        (h) => h.nameHint === "Временная коронка принт/фрез на винтовой фиксации",
      ),
    ).toBe(true);
    expect(inferred.some((h) => /немедленн/i.test(h.nameHint))).toBe(false);
    expect(inferred.some((h) => /основан/i.test(h.nameHint))).toBe(true);
  });
});
