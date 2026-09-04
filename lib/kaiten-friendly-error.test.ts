import { describe, expect, it } from "vitest";
import { friendlyKaitenApiErrorText } from "@/lib/kaiten-friendly-error";

describe("friendlyKaitenApiErrorText", () => {
  it("разбирает JSON message про completed due date", () => {
    const raw = JSON.stringify({
      message:
        "select * from card_update_2($1, $2, $3, $4) - ## 2 It is currently not allowed to change a due date of completed cards",
    });
    expect(friendlyKaitenApiErrorText(502, raw, "fallback")).toMatch(
      /завершённой карточки нельзя менять срок/i,
    );
  });

  it("не отдаёт сырой SQL card_update в UI", () => {
    expect(
      friendlyKaitenApiErrorText(
        502,
        "select * from card_update_2($1) boom",
        "Kaiten не принял изменения",
      ),
    ).toBe("Kaiten не принял изменения");
  });

  it("кириллический fallback при rate limit", () => {
    expect(
      friendlyKaitenApiErrorText(429, "x", "fallback", { rateLimited: true }),
    ).toMatch(/Слишком много запросов/);
  });
});
