import { describe, expect, it } from "vitest";
import {
  financeOfficeDebtPaymentLabel,
  financeOfficeDebtPaymentWhere,
  financeOfficeDebtScopeWhere,
  looksLikeDebtNotifyEmail,
} from "@/lib/finance-office-debts";
import { formatYmdInMsk, subtractMskWorkingDaysBeforeYmd } from "@/lib/msk-calendar";
import { moscowDayBoundsUtc } from "@/lib/shipments-date-range";

describe("financeOfficeDebtPaymentWhere", () => {
  it("берёт не оплачено и частично оплачено", () => {
    const json = JSON.stringify(financeOfficeDebtPaymentWhere());
    expect(json).toContain("Не оплачено");
    expect(json).toContain("Частично оплачено");
    expect(json).not.toContain("Оплачено");
  });
});

describe("financeOfficeDebtPaymentLabel", () => {
  it("показывает не оплачено и сумму частичной оплаты", () => {
    expect(financeOfficeDebtPaymentLabel("", null)).toBe("Не оплачено");
    expect(financeOfficeDebtPaymentLabel("Ожидает оплаты", null)).toBe(
      "Не оплачено",
    );
    expect(financeOfficeDebtPaymentLabel("Частично оплачено", 1500)).toBe(
      "Частично оплачено · 1500 ₽",
    );
  });
});

describe("looksLikeDebtNotifyEmail", () => {
  it("отсекает a@b и пробелы, принимает кириллический домен с точкой", () => {
    expect(looksLikeDebtNotifyEmail("a@b")).toBe(false);
    expect(looksLikeDebtNotifyEmail("x @y.ru")).toBe(false);
    expect(looksLikeDebtNotifyEmail("a@b.c")).toBe(true);
    expect(looksLikeDebtNotifyEmail("бух@клиника.рф")).toBe(true);
  });
});

describe("financeOfficeDebtScopeWhere", () => {
  it("режет по endExclusive дня cutoff (10 раб. дней МСК до 25.08.2026)", () => {
    const now = new Date("2026-08-25T09:00:00.000Z");
    expect(formatYmdInMsk(now)).toBe("2026-08-25");
    const cutoff = subtractMskWorkingDaysBeforeYmd("2026-08-25", 10);
    expect(cutoff).toBe("2026-08-11");
    const { endExclusive } = moscowDayBoundsUtc(cutoff);
    const json = JSON.stringify(
      financeOfficeDebtScopeWhere({ tenantId: "t1", workingDays: 10, now }),
    );
    expect(json).toContain(endExclusive.toISOString());
    expect(json).toContain("2026-08-11T21:00:00.000Z");
    expect(json).toContain("Не оплачено");
  });
});
