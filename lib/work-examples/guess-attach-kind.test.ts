import { describe, expect, it } from "vitest";
import { guessWorkExampleAttachKind } from "@/lib/work-examples/guess-attach-kind";

describe("guessWorkExampleAttachKind", () => {
  it("фото: кириллица до и после расширения", () => {
    expect(
      guessWorkExampleAttachKind({ name: "снимок коронки.png", type: "image/png" }),
    ).toBe("PHOTO");
    expect(
      guessWorkExampleAttachKind({ name: "фото 178 от 10.02.2026.webp", type: "" }),
    ).toBe("PHOTO");
  });

  it("кад: stl/html/zip среди кириллицы", () => {
    expect(guessWorkExampleAttachKind({ name: "модель челюсти.stl", type: "" })).toBe(
      "CAD",
    );
    expect(
      guessWorkExampleAttachKind({ name: "сцена exocad.html", type: "text/html" }),
    ).toBe("CAD");
    expect(guessWorkExampleAttachKind({ name: "проект.zip", type: "" })).toBe("CAD");
  });

  it("прочий файл", () => {
    expect(
      guessWorkExampleAttachKind({
        name: "счёт 178 от 10.02.2026.pdf",
        type: "application/pdf",
      }),
    ).toBe("FILE");
  });
});
