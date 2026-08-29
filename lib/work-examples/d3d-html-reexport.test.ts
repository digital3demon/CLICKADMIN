import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { extractExocadHtmlPayload } from "@/lib/work-examples/exocad-html-extract";
import { makeDentalHtml } from "@/lib/work-examples/d3d-reexport-fixture";
import {
  buildD3dSceneFromExocadHtml,
  fillD3dSceneTemplate,
  gzipD3dScenePayload,
  renderExocadHtmlAsD3dDocument,
} from "@/lib/work-examples/d3d-html-reexport";

const STUB_TEMPLATE = `<!DOCTYPE html><html><head>
<meta name="d3d-scene" content="1" />
<title>__TITLE__</title></head><body>
__PAYLOAD__
<script>__VIEWER_JS__</script>
</body></html>`;

describe("d3d html reexport", () => {
  it("собирает D3D-сцену из синтетического exocad HTML с кириллицей", async () => {
    const html = makeDentalHtml();
    const scene = buildD3dSceneFromExocadHtml(html, "  Тындик Невский  ");
    expect(scene.viewer_defaults.lighting_profile).toBe("d3dHtml");
    expect(scene.viewer_defaults.mesh_color).toBe("#e6c8a8");
    expect(scene.meshes).toHaveLength(1);
    expect(scene.meshes[0]!.name).toBe("коронка Тындик");
    expect(scene.meshes[0]!.buffers.ctm_b64.length).toBeGreaterThan(20);
    expect(scene.meshes[0]!.buffers.vertex_count).toBe(3);

    const doc = await renderExocadHtmlAsD3dDocument(html, "витрина Тындик", STUB_TEMPLATE);
    expect(doc).toContain('id="d3d-scene-payload"');
    expect(doc).toContain("/d3d/d3d_scene_viewer.js");
    expect(doc).toContain('id="embed-lite"');
    expect(doc).toContain("витрина Тындик");
    expect(doc).not.toContain("__VIEWER_JS__");

    const b64 = await gzipD3dScenePayload(scene);
    const json = gunzipSync(Buffer.from(b64, "base64")).toString("utf8");
    expect(json).toContain("d3dHtml");
    expect(fillD3dSceneTemplate(STUB_TEMPLATE, "x", "Y").includes("application/d3d+gzip")).toBe(
      true,
    );
    expect(extractExocadHtmlPayload(html).length).toBeGreaterThan(8);
  });

  it("реальный Тындик → D3D payload с мешами", () => {
    const path = "f:/CADData/Тындик -Невский Денис/Тындик -Невский Денис.html";
    let html: string;
    try {
      html = readFileSync(path, "utf8");
    } catch {
      return;
    }
    const scene = buildD3dSceneFromExocadHtml(html, "Тындик");
    expect(scene.meshes.length).toBeGreaterThan(10);
    expect(scene.viewer_defaults.lighting_profile).toBe("d3dHtml");
    expect(scene.meshes.some((m) => m.buffers.vertex_count > 1000)).toBe(true);
  });
});
