import { describe, expect, it } from "vitest";
import {
  textIncludesAdminLabMention,
  textIncludesClicklabMention,
} from "@/lib/kaiten-comment-parse";

describe("textIncludesAdminLabMention", () => {
  it("находит кастомный тег после нормализации HTML и кириллицы рядом", () => {
    expect(textIncludesAdminLabMention("Напомни @my_lab завтра", "my_lab")).toBe(true);
    expect(textIncludesAdminLabMention("без тега", "my_lab")).toBe(false);
  });

  it("совместимо с прежним @clicklab по умолчанию", () => {
    expect(textIncludesClicklabMention("письмо @clicklab про мост")).toBe(true);
    expect(textIncludesAdminLabMention("письмо @clicklab про мост", "clicklab")).toBe(
      true,
    );
  });
});
