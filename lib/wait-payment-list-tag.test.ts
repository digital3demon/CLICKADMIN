import { describe, expect, it } from "vitest";
import {
  WAIT_PAYMENT_TAG_BASE,
  buildWaitPaymentListTagLabel,
  isWaitPaymentListTagLabel,
  sanitizeWaitPaymentNote,
  waitPaymentNoteFromLabel,
} from "@/lib/wait-payment-list-tag";

describe("wait-payment list tag", () => {
  it("строит метку без хвоста и с хвостом до 20", () => {
    expect(buildWaitPaymentListTagLabel("")).toBe(WAIT_PAYMENT_TAG_BASE);
    expect(buildWaitPaymentListTagLabel("  доплата  ")).toBe(
      "ждем оплату доплата",
    );
    expect(buildWaitPaymentListTagLabel("а".repeat(25)).length).toBe(
      WAIT_PAYMENT_TAG_BASE.length + 1 + 20,
    );
  });

  it("кириллица до и после: распознаёт «ждем» и «ждём»", () => {
    expect(isWaitPaymentListTagLabel("шапка ждем оплату хвост")).toBe(false);
    expect(isWaitPaymentListTagLabel("ждем оплату")).toBe(true);
    expect(isWaitPaymentListTagLabel("ждём оплату до 10.09")).toBe(true);
    expect(waitPaymentNoteFromLabel("префикс ждем оплату")).toBe("");
    expect(waitPaymentNoteFromLabel("ждем оплату после сверки")).toBe(
      "после сверки",
    );
  });

  it("выкидывает двоеточие и лишние символы из хвоста", () => {
    expect(sanitizeWaitPaymentNote("ждём: 50%!!!")).toBe("ждём 50");
  });
});
