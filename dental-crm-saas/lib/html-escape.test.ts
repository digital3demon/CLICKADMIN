import { describe, it, expect } from "vitest";
import { escapeHtml } from "@/lib/html-escape";

describe("escapeHtml", () => {
  it("escapes special characters", () => {
    expect(escapeHtml(`a&b<c>"d`)).toBe("a&amp;b&lt;c&gt;&quot;d");
  });

  it("leaves plain text unchanged", () => {
    expect(escapeHtml("hello")).toBe("hello");
  });
});
