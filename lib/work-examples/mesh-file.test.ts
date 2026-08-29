import { describe, expect, it } from "vitest";
import {
  isWorkExampleViewableHtml,
  isWorkExampleViewableMesh,
  workExampleFileContentType,
  workExampleMeshKind,
} from "@/lib/work-examples/mesh-file";

describe("work example mesh files", () => {
  it("stl/ply/obj среди кириллицы, остальное нет", () => {
    expect(workExampleMeshKind("смена_верх.stl")).toBe("stl");
    expect(workExampleMeshKind("челюсть Малинина.PLY")).toBe("ply");
    expect(workExampleMeshKind("модель Невский.obj")).toBe("obj");
    expect(isWorkExampleViewableMesh("проект.3mf")).toBe(false);
    expect(isWorkExampleViewableMesh("архив.zip")).toBe(false);
    expect(isWorkExampleViewableMesh("скан.drc")).toBe(false);
  });

  it("html витрины среди кириллицы, отдаём text/html", () => {
    expect(isWorkExampleViewableHtml("витрина_Малинина.html")).toBe(true);
    expect(isWorkExampleViewableHtml("сцена Невский.HTM")).toBe(true);
    expect(isWorkExampleViewableHtml("смена_верх.stl")).toBe(false);
    expect(workExampleFileContentType("витрина.html", "application/octet-stream")).toBe(
      "text/html; charset=utf-8",
    );
  });
});
