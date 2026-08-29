/**
 * Реэкспорт exocad HTML в документ D3Dviewer (тот же template + gzip payload).
 * Свет d3dHtml, цвет #e6c8a8. Сканы — CTM без bake; фото — image + matrix.
 */

import { injectD3dEmbedLiteCss } from "@/lib/work-examples/d3d-embed-lite";
import {
  extractExocadHtmlPayload,
  identityMeshMatrix,
  parseExocadCtmMeshRecords,
  type ExocadCtmMeshRecord,
} from "@/lib/work-examples/exocad-html-extract";
import { decodeOpenCtm } from "@/lib/work-examples/openctm-decode";

export const D3D_HTML_MESH_COLOR = "#e6c8a8";
export const D3D_SCENE_TEMPLATE_PATH = "/d3d/d3d_scene_template.html";

export type D3dHtmlSceneV1 = {
  version: 1;
  title: string;
  exported_at: string;
  camera: Record<string, never>;
  views: unknown[];
  meshes: D3dHtmlMeshV1[];
  comments: unknown[];
  measurements: unknown[];
  viewer_defaults: {
    mesh_color: string;
    flat_shading: boolean;
    lighting_profile: "d3dHtml";
    theme: "dark";
  };
};

export type D3dHtmlMeshV1 = {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  flat_shading: boolean;
  mesh_color: string;
  transform: number[];
  buffers: {
    positions_b64: string;
    indices_b64: string;
    ctm_b64: string;
    has_vertex_colors: boolean;
    has_image: boolean;
    image_b64?: string;
    vertex_count: number;
    triangle_count: number;
  };
};

function uint8ToB64(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let bin = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Копия в обычный ArrayBuffer: BlobPart и Uint8Array ctor отвергают ArrayBufferLike (TS 5.7+). */
function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return copy.buffer as ArrayBuffer;
}

async function gzipBytes(data: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream !== "function") {
    throw new Error("gzip: CompressionStream недоступен");
  }
  const stream = new Blob([toArrayBuffer(data)]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array((await new Response(stream).arrayBuffer()) as ArrayBuffer);
}

function recordToMesh(rec: ExocadCtmMeshRecord, index: number): D3dHtmlMeshV1 | null {
  if (rec.ctmBlob.length < 12) return null;
  let vertexCount = 0;
  let triangleCount = 0;
  try {
    const decoded = decodeOpenCtm(rec.ctmBlob);
    vertexCount = decoded.positions.length / 3;
    triangleCount = decoded.indices.length / 3;
  } catch {
    return null;
  }
  const photo = rec.hasTexture && rec.textureBytes && rec.textureBytes.length > 0;
  const transform = photo ? Array.from(rec.matrix) : Array.from(identityMeshMatrix());
  return {
    id: `mesh-${index}`,
    name: rec.name || `Объект ${index + 1}`,
    visible: true,
    opacity: 1,
    flat_shading: true,
    mesh_color: D3D_HTML_MESH_COLOR,
    transform,
    buffers: {
      positions_b64: "",
      indices_b64: "",
      ctm_b64: uint8ToB64(rec.ctmBlob),
      has_vertex_colors: false,
      has_image: Boolean(photo),
      image_b64: photo ? uint8ToB64(rec.textureBytes!) : undefined,
      vertex_count: vertexCount,
      triangle_count: triangleCount,
    },
  };
}

export function buildD3dSceneFromExocadHtml(html: string, title: string): D3dHtmlSceneV1 {
  const records = parseExocadCtmMeshRecords(extractExocadHtmlPayload(html));
  const meshes: D3dHtmlMeshV1[] = [];
  records.forEach((rec, i) => {
    const mesh = recordToMesh(rec, i);
    if (mesh) meshes.push(mesh);
  });
  if (!meshes.length) {
    throw new Error("в HTML нет мешей OpenCTM");
  }
  return {
    version: 1,
    title: title.replace(/\s+/g, " ").trim().slice(0, 160) || "Сцена",
    exported_at: new Date().toISOString(),
    camera: {},
    views: [],
    meshes,
    comments: [],
    measurements: [],
    viewer_defaults: {
      mesh_color: D3D_HTML_MESH_COLOR,
      flat_shading: true,
      lighting_profile: "d3dHtml",
      theme: "dark",
    },
  };
}

export function fillD3dSceneTemplate(template: string, title: string, payloadB64: string): string {
  const payload = `<script type="application/d3d+gzip" id="d3d-scene-payload">${payloadB64}</script>`;
  return injectD3dEmbedLiteCss(
    template
      .replace(/__TITLE__/g, htmlEscape(title))
      .replace(/__PAYLOAD__/g, payload)
      .replace(/<script>__VIEWER_JS__<\/script>/g, '<script src="/d3d/d3d_scene_viewer.js"></script>'),
  );
}

export async function gzipD3dScenePayload(scene: D3dHtmlSceneV1): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(scene));
  return uint8ToB64(await gzipBytes(json));
}

export async function renderExocadHtmlAsD3dDocument(
  html: string,
  title: string,
  template: string,
): Promise<string> {
  const scene = buildD3dSceneFromExocadHtml(html, title);
  const b64 = await gzipD3dScenePayload(scene);
  return fillD3dSceneTemplate(template, scene.title, b64);
}
