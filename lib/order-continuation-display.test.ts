import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildKanbanContinuationLine,
  buildKaitenContinuationLine,
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
