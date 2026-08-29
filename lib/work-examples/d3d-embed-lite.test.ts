import { describe, expect, it } from "vitest";
import {
  D3D_EMBED_LITE_STYLE_ID,
  injectD3dEmbedLiteCss,
} from "@/lib/work-examples/d3d-embed-lite";

describe("d3d embed lite css", () => {
  it("вставляет style перед </head> среди кириллицы", () => {
    const html = `<html><head><title>витрина Тындик</title></head><body>Невский</body></html>`;
    const out = injectD3dEmbedLiteCss(html);
    expect(out).toContain(`id="${D3D_EMBED_LITE_STYLE_ID}"`);
    expect(out).toContain("#articulator-panel");
    expect(out).not.toMatch(/#mesh-panel\s*,|#mesh-panel\s*\{/);
    expect(out.indexOf("embed-lite")).toBeLessThan(out.indexOf("</head>"));
    expect(out).toContain("витрина Тындик");
    expect(out).toContain("Невский");
  });

  it("не дублирует style", () => {
    const once = injectD3dEmbedLiteCss("<head></head>");
    expect(injectD3dEmbedLiteCss(once)).toBe(once);
  });
});
