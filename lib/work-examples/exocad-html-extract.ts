/**
 * Exocad DentalWebGL HTML → меши для D3D-вьюера.
 * Источник: 3d viever `extract_html_payload` + `parse_ctm_mesh_records`.
 * Фото-плоскости (HasTexture) пропускаем — без JPEG они ломают кадр.
 */

import { decodeOpenCtm } from "@/lib/work-examples/openctm-decode";

const HTML_DATA_MARKER = 'DentalWebGL.m_Data = {"data": "';
const FILE_VERSION_MAX = 6;

export type WorkExampleInlineMesh = {
  name?: string;
  positions: Float32Array;
  indices: Uint32Array;
};

export type ExocadCtmMeshRecord = {
  hasTexture: boolean;
  matrix: Float32Array;
  ctmBlob: Uint8Array;
  textureBytes: Uint8Array | null;
  name?: string;
};

export function extractExocadHtmlPayload(html: string): Uint8Array {
  const pos = html.lastIndexOf(HTML_DATA_MARKER);
  if (pos < 0) {
    throw new Error("exocad HTML: DentalWebGL.m_Data marker not found");
  }
  const start = pos + HTML_DATA_MARKER.length;
  const tail = html.slice(start);
  let end = 0;
  while (end < tail.length) {
    const c = tail.charCodeAt(end);
    const ok =
      (c >= 48 && c <= 57) ||
      (c >= 65 && c <= 90) ||
      (c >= 97 && c <= 122) ||
      c === 43 ||
      c === 47 ||
      c === 61;
    if (!ok) break;
    end += 1;
  }
  const b64 = tail.slice(0, end);
  const pad = (4 - (b64.length % 4)) % 4;
  const padded = b64 + "=".repeat(pad);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export function identityMeshMatrix(): Float32Array {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

export function isIdentityMeshMatrix(m: ArrayLike<number>): boolean {
  const id = identityMeshMatrix();
  for (let i = 0; i < 16; i += 1) {
    if (Math.abs(id[i]! - (m[i] ?? 0)) > 1e-5) return false;
  }
  return true;
}

/** Column-major 4×4, как DentalWebGL / THREE.Matrix4.elements. */
export function applyMeshMatrixToPositions(
  positions: Float32Array,
  m: ArrayLike<number>,
): void {
  if (isIdentityMeshMatrix(m) || positions.length < 3) return;
  for (let i = 0; i + 2 < positions.length; i += 3) {
    const x = positions[i]!;
    const y = positions[i + 1]!;
    const z = positions[i + 2]!;
    positions[i] = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
    positions[i + 1] = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
    positions[i + 2] = m[2]! * x + m[6]! * y + m[10]! * z + m[14]!;
  }
}

export function meshMatrixLinearDet(m: ArrayLike<number>): number {
  const a = m[0]!;
  const b = m[4]!;
  const c = m[8]!;
  const d = m[1]!;
  const e = m[5]!;
  const f = m[9]!;
  const g = m[2]!;
  const h = m[6]!;
  const i = m[10]!;
  return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
}

export function reverseTriangleWinding(indices: Uint32Array): void {
  for (let i = 0; i + 2 < indices.length; i += 3) {
    const a = indices[i]!;
    indices[i] = indices[i + 2]!;
    indices[i + 2] = a;
  }
}

class Parser {
  constructor(
    private readonly data: Uint8Array,
    private off = 0,
  ) {}

  private readBytes(n: number): Uint8Array {
    const end = this.off + n;
    if (end > this.data.length) {
      throw new Error(`unexpected EOF (+${n} @ ${this.off})`);
    }
    const slice = this.data.subarray(this.off, end);
    this.off = end;
    return slice;
  }

  readI32(): number {
    const b = this.readBytes(4);
    return (b[0]! | (b[1]! << 8) | (b[2]! << 16) | (b[3]! << 24)) >> 0;
  }

  readF32(): number {
    const b = this.readBytes(4);
    return new DataView(b.buffer, b.byteOffset, 4).getFloat32(0, true);
  }

  readBool(): boolean {
    return this.readI32() !== 0;
  }

  readString(): string {
    const len = this.readI32() >>> 0;
    const padded = Math.ceil(len / 4) * 4;
    const chunk = this.readBytes(padded);
    const raw = chunk.subarray(0, Math.min(len, chunk.length));
    try {
      return new TextDecoder("utf-8", { fatal: false }).decode(raw);
    } catch {
      return "";
    }
  }

  readColorRgb(): [number, number, number] {
    const b = this.readBytes(4);
    return [b[0]!, b[1]!, b[2]!];
  }

  readVector3(): void {
    this.readBytes(12);
  }

  readMatrixF32(): Float32Array {
    const matrix = new Float32Array(16);
    for (let i = 0; i < 16; i += 1) matrix[i] = this.readF32();
    return matrix;
  }

  readCtmBlob(): Uint8Array {
    const size = this.readI32() >>> 0;
    const padded = Math.ceil(size / 4) * 4;
    const chunk = this.readBytes(padded);
    return chunk.subarray(0, Math.min(size, chunk.length));
  }

  readImageEmbedded(): Uint8Array | null {
    const size = this.readI32() >>> 0;
    if (size === 0) return null;
    this.readString();
    const padded = Math.ceil(size / 4) * 4;
    const chunk = this.readBytes(padded);
    return chunk.subarray(0, Math.min(size, chunk.length));
  }

  readTreePaths(): Array<{ name: string }> {
    const count = this.readI32() >>> 0;
    const out: Array<{ name: string }> = [];
    for (let i = 0; i < count; i += 1) {
      const name = this.readString();
      this.readColorRgb();
      out.push({ name });
    }
    return out;
  }

  skipLight(): void {
    this.readF32();
    this.readF32();
    this.readF32();
    this.readVector3();
    this.readBool();
    this.readVector3();
    this.readI32();
    this.readColorRgb();
    this.readColorRgb();
    this.readColorRgb();
    this.readColorRgb();
    this.readF32();
    this.readF32();
    this.readF32();
  }

  readViews(): void {
    const count = this.readI32() >>> 0;
    for (let i = 0; i < count; i += 1) {
      this.readString();
      this.readMatrixF32();
    }
  }

  skipAnnotation(version: number): void {
    if (version > 3) this.readCtmBlob();
    this.readString();
    this.readVector3();
    this.readVector3();
    this.readColorRgb();
    this.readTreePaths();
    if (version > 2) this.readBool();
  }

  skipCreateScene(version: number): void {
    if (version > 1) this.readString();
    this.readString();
    this.skipLight();
    this.readImageEmbedded(); // фон сцены, не меш
    this.readViews();
    this.readViews();
    const ann = this.readI32() >>> 0;
    for (let i = 0; i < ann; i += 1) this.skipAnnotation(version);
  }

  parseMeshRecord(version: number): {
    hasTexture: boolean;
    matrix: Float32Array;
    ctmBlob: Uint8Array;
    name?: string;
  } {
    this.readBool();
    this.readBool();
    const hasTexture = this.readBool();
    this.readColorRgb();
    this.readColorRgb();
    this.readColorRgb();
    this.readColorRgb();
    this.readF32();
    this.readF32();
    this.readF32();
    this.readColorRgb();
    this.readF32();
    const matrix = this.readMatrixF32();
    const ctmBlob = this.readCtmBlob();
    this.readImageEmbedded();
    this.readF32();
    const treePaths = this.readTreePaths();
    if (version > 2) this.readBool();
    if (version > 4) {
      this.readBool();
      this.readBool();
    }
    const last = treePaths.at(-1)?.name.trim();
    return {
      hasTexture,
      matrix,
      ctmBlob,
      name: last || undefined,
    };
  }
}

export function parseExocadCtmMeshRecords(raw: Uint8Array): ExocadCtmMeshRecord[] {
  const p = new Parser(raw);
  const version = p.readI32();
  if (version > FILE_VERSION_MAX) {
    throw new Error(`unsupported webview file version ${version}`);
  }
  if (version > 1) p.readString();
  if (version > 5) {
    p.readBool();
    p.readString();
    p.readString();
  }
  const password = p.readString();
  if (password) {
    throw new Error("encrypted exocad HTML scene is not supported");
  }
  p.skipCreateScene(version);
  const meshCount = p.readI32() >>> 0;
  const out: ExocadCtmMeshRecord[] = [];
  for (let i = 0; i < meshCount; i += 1) {
    out.push(p.parseMeshRecord(version));
  }
  return out;
}

/** Сканы/коронки как после import в D3D: CTM без bake позы; фото пропускаем. */
export function extractExocadHtmlMeshes(html: string): WorkExampleInlineMesh[] {
  const raw = extractExocadHtmlPayload(html);
  const records = parseExocadCtmMeshRecords(raw);
  const out: WorkExampleInlineMesh[] = [];
  for (const rec of records) {
    if (rec.hasTexture || rec.ctmBlob.length < 12) continue;
    try {
      const decoded = decodeOpenCtm(rec.ctmBlob);
      out.push({
        name: rec.name,
        positions: decoded.positions,
        indices: decoded.indices,
      });
    } catch {
      /* битый CTM — пропускаем */
    }
  }
  return out;
}
