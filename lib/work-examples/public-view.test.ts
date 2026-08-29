import { describe, expect, it } from "vitest";
import {
  buildPublicWorkExampleView,
  publicWorkExampleViewHasPii,
} from "@/lib/work-examples/public-view";

describe("buildPublicWorkExampleView", () => {
  it("не отдаёт номер наряда и фамилии, прячет удалённые файлы и ссылку", () => {
    const view = buildPublicWorkExampleView({
      title: "Сплинт Малинина верх",
      cardTypes: [{ id: "t1", name: "Сплинт" }],
      compositionSnapshot: [
        { name: "Сплинт Малинина", quantity: 1, unitPriceRub: 5000 },
      ],
      cloudUrl: "https://disk.example/папка",
      cloudUrlDeletedAt: new Date(),
      technicianNotes: "аккуратно",
      doctorComments: "",
      files: [
        {
          id: "f1",
          kind: "PHOTO",
          fileName: "верх_малинина.jpg",
          mime: "image/jpeg",
          sizeBytes: 12,
          deletedAt: null,
        },
        {
          id: "f2",
          kind: "FILE",
          fileName: "секрет.pdf",
          mime: "application/pdf",
          sizeBytes: 1,
          deletedAt: new Date(),
        },
      ],
    });
    expect(view.title).toBe("Сплинт Малинина верх");
    expect(view.cloudUrl).toBeNull();
    expect(view.files.map((f) => f.id)).toEqual(["f1"]);
    expect(view.files[0]?.fileName).toContain("малинина");
    expect(publicWorkExampleViewHasPii(view)).toBe(false);
    expect(JSON.stringify(view)).not.toMatch(
      /orderNumber|patientName|doctorName|clinicId|deletedBy/,
    );
  });
});
