import { describe, expect, it } from "vitest";
import { shortArcLabelFromDisplayName } from "@/lib/kanban/kanban-person-display";

describe("shortArcLabelFromDisplayName", () => {
  it("takes first word", () => {
    expect(shortArcLabelFromDisplayName("Всеволод Семёнов")).toBe("Всеволод");
  });

  it("keeps short single name", () => {
    expect(shortArcLabelFromDisplayName("Анна")).toBe("Анна");
  });

  it("truncates long first names to maxChars with ellipsis", () => {
    expect(shortArcLabelFromDisplayName("Айрапетянчик", 9)).toBe("Айрапетя…");
  });

  it("handles empty", () => {
    expect(shortArcLabelFromDisplayName("   ")).toBe("");
  });
});
