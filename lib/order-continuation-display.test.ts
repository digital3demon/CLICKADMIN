import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildKanbanContinuationFollowupLine,
  buildKanbanContinuationLine,
  buildKaitenContinuationFollowupLine,
  buildKaitenContinuationLine,
  kaitenDescriptionWithContinuationPrefix,
} from "@/lib/order-continuation-display";

describe("buildKaitenContinuationLine", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("markdown-ссылка при kaitenCardId и шаблоне URL", () => {
    vi.stubEnv(
      "KAITEN_CARD_URL_TEMPLATE",
      "https://clicklab.kaiten.ru/{id}",
    );
    expect(
      buildKaitenContinuationLine({
        orderNumber: "2605-001",
        kaitenCardId: 12345,
      }),
    ).toBe("Продолжение работы [2605-001](https://clicklab.kaiten.ru/12345)");
  });

  it("только текст без ссылки, если нет kaitenCardId", () => {
    expect(
      buildKaitenContinuationLine({
        orderNumber: "2605-001",
        kaitenCardId: null,
      }),
    ).toBe("Продолжение работы 2605-001");
  });
});

describe("kaitenDescriptionWithContinuationPrefix", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("добавляет строку Kaiten перед телом из канбана", () => {
    vi.stubEnv(
      "KAITEN_CARD_URL_TEMPLATE",
      "https://clicklab.kaiten.ru/{id}",
    );
    expect(
      kaitenDescriptionWithContinuationPrefix("Заказ от клиента:\nтекст", {
        orderNumber: "2605-001",
        kaitenCardId: 99,
      }),
    ).toBe(
      "Продолжение работы [2605-001](https://clicklab.kaiten.ru/99)\n\nЗаказ от клиента:\nтекст",
    );
  });
});

describe("buildKaitenContinuationFollowupLine", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("markdown-ссылка на продолжение в Kaiten", () => {
    vi.stubEnv(
      "KAITEN_CARD_URL_TEMPLATE",
      "https://clicklab.kaiten.ru/{id}",
    );
    expect(
      buildKaitenContinuationFollowupLine({
        orderNumber: "2606-142",
        kaitenCardId: 65845455,
      }),
    ).toBe(
      "У этой работы есть продолжение [2606-142](https://clicklab.kaiten.ru/65845455)",
    );
  });
});

describe("buildKanbanContinuationFollowupLine", () => {
  it("ссылка на карточку канбана продолжения", () => {
    const line = buildKanbanContinuationFollowupLine({
      orderNumber: "2606-142",
      orderId: "child-1",
    });
    expect(line).toMatch(
      /^У этой работы есть продолжение \[2606-142\]\(\/kanban\?orderRef=/,
    );
  });
});

describe("kaitenDescriptionWithContinuationPrefix followups", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("родитель и продолжение в одном описании", () => {
    vi.stubEnv(
      "KAITEN_CARD_URL_TEMPLATE",
      "https://clicklab.kaiten.ru/{id}",
    );
    expect(
      kaitenDescriptionWithContinuationPrefix(
        "Заказ от клиента:\nтекст",
        { orderNumber: "2605-001", kaitenCardId: 11 },
        [{ orderNumber: "2606-142", orderId: "c1", kaitenCardId: 22 }],
      ),
    ).toBe(
      [
        "Продолжение работы [2605-001](https://clicklab.kaiten.ru/11)",
        "У этой работы есть продолжение [2606-142](https://clicklab.kaiten.ru/22)",
        "Заказ от клиента:\nтекст",
      ].join("\n\n"),
    );
  });
});

describe("buildKanbanContinuationLine", () => {
  it("относительная ссылка на карточку канбана родителя", () => {
    const line = buildKanbanContinuationLine({
      orderNumber: "2605-001",
      orderId: "ord-parent-1",
    });
    expect(line).toMatch(/^Продолжение работы \[2605-001\]\(\/kanban\?orderRef=/);
  });

  it("только текст без orderId", () => {
    expect(
      buildKanbanContinuationLine({
        orderNumber: "2605-001",
      }),
    ).toBe("Продолжение работы 2605-001");
  });
});
