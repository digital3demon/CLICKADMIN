import { describe, expect, it } from "vitest";
import { workExampleD3dViewerHref } from "@/lib/work-examples/d3d-viewer-href";

describe("workExampleD3dViewerHref", () => {
  it("кодирует src, кириллица в пути не ломает query", () => {
    const href = workExampleD3dViewerHref("/uploads/Батиева3 -дизайн.html");
    expect(href.startsWith("/d3d-viewer/index.html?src=")).toBe(true);
    const src = new URL(href, "https://crm.example").searchParams.get("src");
    expect(src).toBe("/uploads/Батиева3 -дизайн.html");
  });

  it("пустой url — страница вьюера без src", () => {
    expect(workExampleD3dViewerHref("")).toBe("/d3d-viewer/index.html");
  });
});
