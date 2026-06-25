import { describe, expect, it } from "vitest";
import { insertTokenIntoControlledInput } from "./insert-template-token";

describe("insertTokenIntoControlledInput", () => {
  it("вставляет токен в середину строки", () => {
    const { nextValue, caret } = insertTokenIntoControlledInput(
      "Наряд  принят",
      6,
      6,
      "{{orderNumber}}",
    );
    expect(nextValue).toBe("Наряд {{orderNumber}} принят");
    expect(caret).toBe(6 + "{{orderNumber}}".length);
  });
});
