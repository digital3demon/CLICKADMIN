import { describe, expect, it } from "vitest";
import {
  d3dHtmlConvertUserMessage,
  d3dHtmlExportCandidateBins,
  mapD3dHtmlExportFailure,
  resolveD3dHtmlExportBin,
} from "@/lib/work-examples/d3d-html-export";

describe("d3d-html-export CLI contract", () => {
  it("env путь среди кириллицы не теряется", () => {
    const bin = resolveD3dHtmlExportBin(
      { D3D_HTML_EXPORT_BIN: "C:\\инструменты\\d3d-html-export.exe" },
      "C:\\проекты\\витрина",
    );
    expect(bin).toBe("C:\\инструменты\\d3d-html-export.exe");
  });

  it("кандидаты включают tools и соседний 3d viever", () => {
    const list = d3dHtmlExportCandidateBins({}, "C:\\проекты\\dental-lab-crm");
    expect(list.some((p) => p.includes("tools"))).toBe(true);
    expect(list.some((p) => p.includes("3d viever"))).toBe(true);
  });

  it("шифрованный Exocad → encrypted_exocad", () => {
    expect(mapD3dHtmlExportFailure("encrypted exocad HTML scene is not supported", false)).toBe(
      "encrypted_exocad",
    );
    expect(mapD3dHtmlExportFailure("сцена зашифрована", false)).toBe("encrypted_exocad");
    expect(mapD3dHtmlExportFailure("boom", true)).toBe("timeout");
    expect(d3dHtmlConvertUserMessage("not_exocad_or_d3d")).toContain("не D3D");
  });
});
