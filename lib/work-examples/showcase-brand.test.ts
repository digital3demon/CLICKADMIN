import { describe, expect, it } from "vitest";
import {
  parseWorkExampleShowcaseBrand,
  parseWorkExampleShowcaseName,
  resolveWorkExampleShowcaseName,
} from "@/lib/work-examples/constants";

describe("work example showcase brand", () => {
  it("имя среди кириллицы до и после", () => {
    expect(parseWorkExampleShowcaseName("  Лаб «Нева»  ")).toBe("Лаб «Нева»");
    expect(resolveWorkExampleShowcaseName("Лаб Нева", "default")).toBe("Лаб Нева");
    expect(resolveWorkExampleShowcaseName("", "default")).toBe("default");
    expect(resolveWorkExampleShowcaseName("", "")).toBe("Лаборатория");
  });

  it("стейт как канбан: имя + путь лого", () => {
    const brand = parseWorkExampleShowcaseBrand({
      displayName: "Студия коронки",
      logoRelPath: "work-examples/_branding/t1",
      logoMime: "image/png",
    });
    expect(brand.displayName).toBe("Студия коронки");
    expect(brand.logoRelPath).toBe("work-examples/_branding/t1");
    expect(brand.logoMime).toBe("image/png");
    expect(parseWorkExampleShowcaseBrand({ logoRelPath: "../etc/passwd" }).logoRelPath).toBeNull();
  });
});
