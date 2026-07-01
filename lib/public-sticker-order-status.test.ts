import { describe, expect, it } from "vitest";
import {
  PUBLIC_STICKER_SHIPPED_LABEL,
  resolveNextLabWorkStatusLabel,
  resolvePublicStickerOrderStatusPills,
} from "./public-sticker-order-status";

describe("resolveNextLabWorkStatusLabel", () => {
  it("следующий этап по воронке", () => {
    expect(resolveNextLabWorkStatusLabel("TO_EXECUTION")).toBe("Согласование");
    expect(resolveNextLabWorkStatusLabel("TO_ADMINS")).toBe(
      PUBLIC_STICKER_SHIPPED_LABEL,
    );
  });
});

describe("resolvePublicStickerOrderStatusPills", () => {
  it("показывает колонку Kaiten как сейчас", () => {
    const r = resolvePublicStickerOrderStatusPills({
      labWorkStatus: "TO_EXECUTION",
      kaitenColumnTitle: "К исполнению",
      kaitenCardId: 1,
      adminShippedOtpr: false,
    });
    expect(r.currentLabel).toBe("К исполнению");
    expect(r.nextLabel).toBe("Согласование");
  });

  it("отправлено — без следующего этапа", () => {
    const r = resolvePublicStickerOrderStatusPills({
      labWorkStatus: "TO_ADMINS",
      kaitenColumnTitle: "Сдана админам",
      kaitenCardId: 1,
      adminShippedOtpr: true,
    });
    expect(r.currentLabel).toBe(PUBLIC_STICKER_SHIPPED_LABEL);
    expect(r.nextLabel).toBeNull();
  });

  it("без Kaiten — этап из labWorkStatus", () => {
    const r = resolvePublicStickerOrderStatusPills({
      labWorkStatus: "PRODUCTION",
      kaitenColumnTitle: null,
      kaitenCardId: null,
      adminShippedOtpr: false,
    });
    expect(r.currentLabel).toBe("Производство");
    expect(r.nextLabel).toBe("Сборка");
  });
});
