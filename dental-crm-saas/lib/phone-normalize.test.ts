import { describe, expect, it } from "vitest";
import {
  normalizeRuPhoneDigits,
  placeholderEmailFromNormalizedPhone,
} from "./phone-normalize";

describe("normalizeRuPhoneDigits", () => {
  it("нормализует 8 и +7", () => {
    expect(normalizeRuPhoneDigits("8 (903) 111-22-33")).toBe("79031112233");
    expect(normalizeRuPhoneDigits("+7 903 1112233")).toBe("79031112233");
  });

  it("добавляет 7 к 10 цифрам с 9", () => {
    expect(normalizeRuPhoneDigits("9031112233")).toBe("79031112233");
  });

  it("отклоняет мусор", () => {
    expect(normalizeRuPhoneDigits("123")).toBeNull();
  });
});

describe("placeholderEmailFromNormalizedPhone", () => {
  it("строит уникальную почту", () => {
    expect(placeholderEmailFromNormalizedPhone("79031112233")).toBe(
      "p79031112233@invite.crm.local",
    );
  });
});
