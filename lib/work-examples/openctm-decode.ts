/**
 * OpenCTM (RAW / MG1 / MG2) → typed buffers.
 * Копия декодера из 3d viever (standalone-viewer/openctmDecode).
 */
import { CTM } from "@/lib/work-examples/vendor/ctm.js";

export type DecodedCtmMesh = {
  positions: Float32Array;
  indices: Uint32Array;
  normals: Float32Array | null;
};

function bytesToBinaryString(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let out = "";
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    const end = Math.min(offset + chunk, bytes.length);
    out += String.fromCharCode(...bytes.subarray(offset, end));
  }
  return out;
}

export function decodeOpenCtm(bytes: Uint8Array): DecodedCtmMesh {
  if (bytes.length < 12) {
    throw new Error("CTM data too short");
  }
  const stream = new CTM.Stream(bytesToBinaryString(bytes));
  const file = new CTM.File(stream);
  const positions = file.body.vertices;
  const indices = file.body.indices;
  if (!positions?.length || !indices?.length) {
    throw new Error("CTM mesh is empty");
  }
  return {
    positions,
    indices,
    normals: file.body.normals ?? null,
  };
}
