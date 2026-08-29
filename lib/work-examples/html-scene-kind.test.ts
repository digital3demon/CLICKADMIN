import { describe, expect, it } from "vitest";
import { workExampleHtmlSceneKind } from "@/lib/work-examples/html-scene-kind";

describe("workExampleHtmlSceneKind", () => {
  it("D3D-реэкспорт среди кириллицы", () => {
    const html = `витрина Тындик <meta name="d3d-scene" content="1" /> Невский generator="D3Dviewer"`;
    expect(workExampleHtmlSceneKind(html)).toBe("d3d");
  });

  it("exocad webview среди кириллицы, не D3D", () => {
    const html = `<!-- Тындик --> title>exocad webview</title> DentalWebGL.m_Data Невский`;
    expect(workExampleHtmlSceneKind(html)).toBe("exocad");
  });

  it("без маркеров — unknown", () => {
    expect(workExampleHtmlSceneKind("просто страница Тындик Невский")).toBe("unknown");
  });
});
