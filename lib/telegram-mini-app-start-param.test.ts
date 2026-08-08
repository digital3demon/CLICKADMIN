import {
  encodeTelegramMiniAppStartParamCard,
  encodeTelegramMiniAppStartParamOrder,
  parseTelegramMiniAppStartParam,
} from "@/lib/telegram-mini-app-start-param";
import { encodeOrderPublicRef } from "@/lib/order-public-ref";
import { describe, expect, it } from "vitest";

describe("telegram mini app start_param", () => {
  it("кодирует и декодирует наряд", () => {
    const orderId = "clxxxxorderid001";
    const param = encodeTelegramMiniAppStartParamOrder(orderId);
    expect(param.startsWith("o_or_")).toBe(true);
    expect(param).toMatch(/^[\w-]+$/);
    const parsed = parseTelegramMiniAppStartParam(param);
    expect(parsed).toEqual({
      kind: "order",
      orderId,
      orderRef: encodeOrderPublicRef(orderId),
    });
  });

  it("кодирует карточку", () => {
    const param = encodeTelegramMiniAppStartParamCard("kaiten-order-abc");
    expect(param).toBe("c_kaiten-order-abc");
    expect(parseTelegramMiniAppStartParam(param)).toEqual({
      kind: "card",
      cardId: "kaiten-order-abc",
    });
  });

  it("отклоняет мусор", () => {
    expect(parseTelegramMiniAppStartParam("x_bad")).toBeNull();
    expect(parseTelegramMiniAppStartParam("o_not-a-ref")).toBeNull();
  });
});
