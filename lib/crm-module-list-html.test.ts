import { describe, expect, it } from "vitest";
import {
  CRM_MODULE_LIST_HTML_MAX_CHARS,
  rememberCrmModuleListHtml,
  readCrmModuleListHtml,
  sanitizeCrmModuleListHtml,
} from "@/lib/crm-module-list-html";

describe("sanitizeCrmModuleListHtml", () => {
  it("кириллица до и после тега остаётся, script и onclick вырезаются", () => {
    const raw = [
      "<div>клиника ",
      "<span onclick=\"steal()\">Соколов</span>",
      " наряд",
      "<script>alert(1)</script>",
      "</div>",
    ].join("");
    const out = sanitizeCrmModuleListHtml(raw);
    expect(out).toContain("клиника ");
    expect(out).toContain("Соколов");
    expect(out).toContain(" наряд");
    expect(out).not.toMatch(/script/i);
    expect(out).not.toMatch(/onclick/i);
  });

  it("пустой и одни теги без текста после вырезания — null", () => {
    expect(sanitizeCrmModuleListHtml("")).toBeNull();
    expect(sanitizeCrmModuleListHtml("   ")).toBeNull();
    expect(sanitizeCrmModuleListHtml("<script>x</script>")).toBeNull();
  });

  it("режет кадр длиннее потолка", () => {
    const raw = `<p>${"я".repeat(CRM_MODULE_LIST_HTML_MAX_CHARS + 50)}</p>`;
    const out = sanitizeCrmModuleListHtml(raw);
    expect(out).not.toBeNull();
    expect(out!.length).toBeLessThanOrEqual(CRM_MODULE_LIST_HTML_MAX_CHARS);
  });
});

describe("rememberCrmModuleListHtml", () => {
  it("читает то, что записали по пути модуля", () => {
    rememberCrmModuleListHtml("/finance-office", "<p>ФинОтдел Соколов</p>");
    expect(readCrmModuleListHtml("/finance-office")).toContain("Соколов");
    rememberCrmModuleListHtml("/finance-office", null);
    expect(readCrmModuleListHtml("/finance-office")).toBeNull();
  });
});
