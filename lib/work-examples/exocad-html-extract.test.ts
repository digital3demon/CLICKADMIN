import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyMeshMatrixToPositions,
  extractExocadHtmlMeshes,
  extractExocadHtmlPayload,
  identityMeshMatrix,
  parseExocadCtmMeshRecords,
} from "@/lib/work-examples/exocad-html-extract";
import { decodeOpenCtm } from "@/lib/work-examples/openctm-decode";

class BinWriter {
  private readonly parts: number[] = [];

  u8(n: number): this {
    this.parts.push(n & 0xff);
    return this;
  }

  i32(n: number): this {
    const v = n | 0;
    this.parts.push(v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff);
    return this;
  }

  f32(n: number): this {
    const buf = new ArrayBuffer(4);
    new DataView(buf).setFloat32(0, n, true);
    const b = new Uint8Array(buf);
    this.parts.push(b[0]!, b[1]!, b[2]!, b[3]!);
    return this;
  }

  str(s: string): this {
    const bytes = new TextEncoder().encode(s);
    this.i32(bytes.length);
    for (const b of bytes) this.u8(b);
    const pad = (4 - (bytes.length % 4)) % 4;
    for (let i = 0; i < pad; i += 1) this.u8(0);
    return this;
  }

  color(r = 0, g = 0, b = 0): this {
    return this.u8(r).u8(g).u8(b).u8(0);
  }

  raw(bytes: Uint8Array): this {
    for (const b of bytes) this.u8(b);
    return this;
  }

  bytes(): Uint8Array {
    return Uint8Array.from(this.parts);
  }
}

function writeCtmString(w: BinWriter, s: string): void {
  const bytes = new TextEncoder().encode(s);
  w.i32(bytes.length);
  w.raw(bytes);
}

/** Минимальный RAW OpenCTM: один треугольник. */
function makeRawCtmTriangle(): Uint8Array {
  const w = new BinWriter();
  w.u8(0x4f).u8(0x43).u8(0x54).u8(0x4d); // OCTM
  w.i32(5);
  w.i32(0x00574152); // RAW
  w.i32(3);
  w.i32(1);
  w.i32(0);
  w.i32(0);
  w.i32(0);
  writeCtmString(w, "");
  w.u8(0x49).u8(0x4e).u8(0x44).u8(0x58); // INDX
  w.i32(0).i32(1).i32(2);
  w.u8(0x56).u8(0x45).u8(0x52).u8(0x54); // VERT
  w.f32(0).f32(0).f32(0);
  w.f32(1).f32(0).f32(0);
  w.f32(0).f32(1).f32(0);
  return w.bytes();
}

function skipLight(w: BinWriter): void {
  w.f32(0).f32(0).f32(0);
  w.f32(0).f32(0).f32(0);
  w.i32(0);
  w.f32(0).f32(0).f32(0);
  w.i32(0);
  w.color().color().color().color();
  w.f32(0).f32(0).f32(0);
}

function makeDentalWebGlPayload(ctm: Uint8Array): Uint8Array {
  const w = new BinWriter();
  w.i32(1);
  w.str("");
  w.str("");
  skipLight(w);
  w.i32(0);
  w.i32(0);
  w.i32(0);
  w.i32(0);
  w.i32(1);
  w.i32(0);
  w.i32(0);
  w.i32(0);
  w.color();
  w.color(230, 200, 168);
  w.color();
  w.color();
  w.f32(1).f32(20).f32(0);
  w.color();
  w.f32(0);
  const id = identityMeshMatrix();
  for (let i = 0; i < 16; i += 1) w.f32(id[i]!);
  w.i32(ctm.length);
  w.raw(ctm);
  const pad = (4 - (ctm.length % 4)) % 4;
  for (let i = 0; i < pad; i += 1) w.u8(0);
  w.i32(0);
  w.f32(0);
  w.i32(1);
  w.str("коронка Тындик");
  w.color();
  return w.bytes();
}

describe("exocad HTML extract", () => {
  it("достаёт base64 payload среди кириллицы", () => {
    const html = `витрина Тындик DentalWebGL.m_Data = {"data": "AQIDBA=="} Невский`;
    const raw = extractExocadHtmlPayload(html);
    expect(Array.from(raw)).toEqual([1, 2, 3, 4]);
  });

  it("матрица сдвигает вершины", () => {
    const pos = new Float32Array([0, 0, 0, 1, 0, 0]);
    const m = identityMeshMatrix();
    m[12] = 10;
    m[13] = -4;
    applyMeshMatrixToPositions(pos, m);
    expect(pos[0]).toBeCloseTo(10);
    expect(pos[1]).toBeCloseTo(-4);
    expect(pos[3]).toBeCloseTo(11);
  });

  it("RAW CTM + DentalWebGL → один меш с кириллическим именем", () => {
    const ctm = makeRawCtmTriangle();
    const decoded = decodeOpenCtm(ctm);
    expect(decoded.positions.length).toBe(9);
    expect(decoded.indices.length).toBe(3);

    const payload = makeDentalWebGlPayload(ctm);
    const records = parseExocadCtmMeshRecords(payload);
    expect(records).toHaveLength(1);
    expect(records[0]!.name).toBe("коронка Тындик");
    expect(records[0]!.hasTexture).toBe(false);

    const b64 = btoa(String.fromCharCode(...payload));
    const html = `сцена Тындик DentalWebGL.m_Data = {"data": "${b64}"} Невский`;
    const meshes = extractExocadHtmlMeshes(html);
    expect(meshes).toHaveLength(1);
    expect(meshes[0]!.name).toBe("коронка Тындик");
    expect(meshes[0]!.positions.length).toBe(9);
  });

  it("реальный exocad HTML Тындик — есть сканы", () => {
    const path = "f:/CADData/Тындик -Невский Денис/Тындик -Невский Денис.html";
    if (!existsSync(path)) return;
    const html = readFileSync(path, "utf8");
    const meshes = extractExocadHtmlMeshes(html);
    expect(meshes.length).toBeGreaterThan(0);
    expect(meshes[0]!.positions.length).toBeGreaterThan(8);
  });
});
