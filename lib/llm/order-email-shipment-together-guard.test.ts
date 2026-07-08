import { describe, expect, it } from "vitest";
import {
  detectShipTogetherRequest,
  normalizeWarningsForShipTogetherRequest,
} from "./order-email-shipment-together-guard";

describe("detectShipTogetherRequest", () => {
  it("detects ship-together with previous order (Zenkina case)", () => {
    const text =
      "пациент Зенкина Полина, аппарат Хааса на индивидуальных кольцах с замками паз 022. " +
      "Если будет возможность, отправьте, пожалуйста, работу вместе с предыдущим заказом (Донцов Матвей, аппарат Хааса).";

    expect(detectShipTogetherRequest(text)).toEqual({
      relatedPatientName: "Донцов Матвей",
      relatedOrderNote: "Донцов Матвей, аппарат Хааса",
    });
  });

  it("returns null for a normal single-patient order", () => {
    expect(
      detectShipTogetherRequest("Пациент Иванов И.И., коронка 46 emax, цвет A2"),
    ).toBeNull();
  });
});

describe("normalizeWarningsForShipTogetherRequest", () => {
  it("replaces false multiple-patients warning with deadline clarification", () => {
    const text =
      "пациент Зенкина Полина, аппарат Хааса. " +
      "Отправьте работу вместе с предыдущим заказом (Донцов Матвей, аппарат Хааса).";

    const result = normalizeWarningsForShipTogetherRequest(
      ["несколько пациентов в одном письме — обработан только первый: Зенкина Полина"],
      text,
      "Зенкина Полина",
    );

    expect(result.shipTogetherRequest?.relatedPatientName).toBe("Донцов Матвей");
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("вместе с другим заказом");
    expect(result.warnings[0]).toContain("Донцов Матвей");
    expect(result.warnings[0]).toContain("подогнать срок");
    expect(result.warnings.some((w) => /несколько пациент/i.test(w))).toBe(false);
  });
});
