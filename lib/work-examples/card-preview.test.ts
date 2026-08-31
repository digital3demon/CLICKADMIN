import { describe, expect, it } from "vitest";
import {
  isWorkExampleCardPreviewRequest,
  withWorkExampleCardPreview,
  workExampleCardPreviewRelPath,
  workExampleFileHref,
} from "@/lib/work-examples/card-preview";

describe("work-example card preview", () => {
  it("query preview=card — да, мусор и кириллица рядом не сбивают", () => {
    expect(isWorkExampleCardPreviewRequest("preview=card")).toBe(true);
    expect(isWorkExampleCardPreviewRequest("?preview=card&note=коронка_до")).toBe(true);
    expect(
      isWorkExampleCardPreviewRequest(new URLSearchParams("preview=card&title=накладки")),
    ).toBe(true);
    expect(isWorkExampleCardPreviewRequest("preview=full")).toBe(false);
    expect(isWorkExampleCardPreviewRequest("")).toBe(false);
  });

  it("соседний путь превью, в т.ч. кириллица в сегменте", () => {
    expect(workExampleCardPreviewRelPath("work-examples/a/b")).toBe(
      "work-examples/a/b.card.jpg",
    );
    expect(workExampleCardPreviewRelPath("s3:work-examples/пример/файл")).toBe(
      "s3:work-examples/пример/файл.card.jpg",
    );
    expect(workExampleCardPreviewRelPath("work-examples/a/b.card.jpg")).toBe(
      "work-examples/a/b.card.jpg",
    );
  });

  it("href плитки с превью", () => {
    expect(workExampleFileHref("ex1", "f1", { preview: true })).toBe(
      "/api/work-examples/ex1/files/f1?preview=card",
    );
    expect(withWorkExampleCardPreview("/api/public/x/y/files/f1")).toBe(
      "/api/public/x/y/files/f1?preview=card",
    );
  });
});
