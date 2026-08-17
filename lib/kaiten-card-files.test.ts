import { describe, expect, it } from "vitest";
import {
  collectKaitenRemoteFiles,
  filesMissingFromOrder,
} from "@/lib/kaiten-card-files";

describe("collectKaitenRemoteFiles", () => {
  it("не схлопывает два image.png с кириллицей вокруг — разные id", () => {
    const files = collectKaitenRemoteFiles([
      {
        files: [
          { id: 101, name: "image.png", mime_type: "image/png", url: "/f/101" },
          { id: 102, name: "image.png", mime_type: "image/png", url: "/f/102" },
        ],
      },
      {
        attachments: [
          {
            id: 103,
            name: "IMG_2026_08_17_12_55_57S.jpg",
            mime: "image/jpeg",
            url: "/f/103",
          },
        ],
      },
    ]);
    expect(files.map((f) => f.kaitenFileId).sort((a, b) => a - b)).toEqual([
      101, 102, 103,
    ]);
    expect(files.filter((f) => f.name === "image.png")).toHaveLength(2);
  });

  it("дедупит один id, если файл и на карточке, и в комментарии", () => {
    const files = collectKaitenRemoteFiles([
      { files: [{ id: 7, name: "снимок.png" }] },
      { files: [{ id: 7, name: "снимок.png" }] },
    ]);
    expect(files).toHaveLength(1);
    expect(files[0]!.kaitenFileId).toBe(7);
  });

  it("оставляет только файлы, которых нет в наряде по kaitenFileId", () => {
    const remote = collectKaitenRemoteFiles([
      {
        files: [
          { id: 101, name: "image.png" },
          { id: 102, name: "image.png" },
        ],
      },
    ]);
    const missing = filesMissingFromOrder(remote, [101]);
    expect(missing.map((f) => f.kaitenFileId)).toEqual([102]);
  });
});
