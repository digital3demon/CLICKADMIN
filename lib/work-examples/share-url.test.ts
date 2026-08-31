import { describe, expect, it } from "vitest";
import {
  isLongWorkExampleShareToken,
  workExampleSharePath,
  workExampleShareUrl,
} from "@/lib/work-examples/share-url";

describe("workExampleShareUrl", () => {
  it("короткий путь без slug, кириллица в токене кодируется", () => {
    expect(workExampleSharePath("Ab3xY9kQ")).toBe("/w/Ab3xY9kQ");
    expect(workExampleSharePath("тындик")).toBe(`/w/${encodeURIComponent("тындик")}`);
    expect(
      workExampleShareUrl("https://lab.example/", "Ab3xY9kQ"),
    ).toBe("https://lab.example/w/Ab3xY9kQ");
  });

  it("пустой токен не даёт ссылку", () => {
    expect(workExampleSharePath("")).toBe("");
    expect(workExampleShareUrl("https://lab.example", "  ")).toBe("");
  });

  it("длинный старый токен отличается от короткого", () => {
    expect(isLongWorkExampleShareToken("Ab3xY9kQ")).toBe(false);
    expect(isLongWorkExampleShareToken("xK9f2mNqR7sT8uVwXyZa1234")).toBe(true);
  });
});
