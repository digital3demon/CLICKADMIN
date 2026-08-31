import { describe, expect, it } from "vitest";
import { parseGoogleDrivePublicListingHtml } from "@/lib/work-examples/google-drive-public-html";

describe("parseGoogleDrivePublicListingHtml", () => {
  it("достаёт файл с кириллическим именем", () => {
    const html = `
      <div>папка Накладки</div>
      <a href="https://drive.google.com/file/d/1h7GRdFiPp7at9JHszx-eGSGVuGCCZNQd/view"
         title="кт до.jpg">кт до.jpg</a>
      <div id="entry-1abcDEF0123456789xyz" title="мрт левый до.JPG"></div>
    `;
    const entries = parseGoogleDrivePublicListingHtml(html);
    expect(entries.some((e) => e.name === "кт до.jpg" && e.kind === "file")).toBe(true);
    expect(entries.some((e) => e.name === "мрт левый до.JPG")).toBe(true);
  });

  it("подтягивает имя из flip-entry и JSON, не оставляет голый id", () => {
    const html = `
      <div id="entry-1LWGsFwYId745zDMbeXWg4RE3sjvmsBSD">
        <div class="flip-entry-title">IMG_3480.JPG</div>
      </div>
      ["1abcDEF0123456789xyz","кт до.jpg"]
    `;
    const entries = parseGoogleDrivePublicListingHtml(html);
    expect(entries.some((e) => e.name === "IMG_3480.JPG")).toBe(true);
    expect(entries.some((e) => e.name === "кт до.jpg")).toBe(true);
  });
});
