import { describe, expect, it } from "vitest";
import { messengerSidebarPreviewLine } from "./messenger-text-preview";

describe("messengerSidebarPreviewLine", () => {
  it("collapses whitespace and truncates long text", () => {
    const long = "а ".repeat(200);
    const out = messengerSidebarPreviewLine(long, 20);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(20);
  });

  it("preserves short Cyrillic message after mention", () => {
    const s = "@clicklab_admin проверьте коронку 12";
    expect(messengerSidebarPreviewLine(s)).toBe(s);
  });
});
