import { describe, expect, it } from "vitest";
import { resolveKaitenPushTitle } from "@/lib/kaiten-card-title";

describe("resolveKaitenPushTitle", () => {
  const computed = "2607-051 Исеев Л. Енькова А.А. коронки 30.07";

  it("ручной mirror при kaitenCardTitleManual", () => {
    expect(
      resolveKaitenPushTitle(
        computed,
        true,
        "2607-051 Исеев Л. Инд.ложки и трансфер чеки 30.07",
      ),
    ).toBe("2607-051 Исеев Л. Инд.ложки и трансфер чеки 30.07");
  });

  it("пересчёт из наряда без manual", () => {
    expect(
      resolveKaitenPushTitle(
        computed,
        false,
        "устаревший текст в mirror",
      ),
    ).toBe(computed);
  });

  it("fallback на пересчёт при manual без mirror", () => {
    expect(resolveKaitenPushTitle(computed, true, null)).toBe(computed);
    expect(resolveKaitenPushTitle(computed, true, "   ")).toBe(computed);
  });
});
