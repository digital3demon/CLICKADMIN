import { describe, expect, it } from "vitest";
import { WORK_EXAMPLE_TRASH_MS } from "@/lib/work-examples/constants";
import { isWorkExampleTrashActive, isWorkExampleTrashExpired } from "@/lib/work-examples/trash";
import { workExampleDeletedCaption } from "@/lib/work-examples/deleted-caption";

describe("work example trash window", () => {
  it("5 суток: внутри окна активно, после — истекло", () => {
    const deletedAt = new Date("2026-08-24T12:00:00.000Z");
    const inside = new Date(deletedAt.getTime() + WORK_EXAMPLE_TRASH_MS - 1000);
    const after = new Date(deletedAt.getTime() + WORK_EXAMPLE_TRASH_MS + 1000);
    expect(isWorkExampleTrashActive(deletedAt, inside)).toBe(true);
    expect(isWorkExampleTrashExpired(deletedAt, after)).toBe(true);
  });
});

describe("workExampleDeletedCaption", () => {
  it("кириллица в имени файла и авторе", () => {
    const text = workExampleDeletedCaption({
      actorLabel: "Всеволод Соколов",
      kind: "file",
      fileName: "смена_верх.stl",
      at: new Date("2026-08-29T16:40:00.000Z"),
    });
    expect(text).toContain("Всеволод Соколов удалил файл смена_верх.stl");
    expect(text).toMatch(/\d{2}\.\d{2}\.\d{4}/);
  });
});
