import { describe, expect, it } from "vitest";
import { workExampleEditorHasContent } from "@/lib/work-examples/editor-dirty";

const empty = {
  title: "",
  tech: "",
  doc: "",
  cloudUrls: [""],
  pendingCount: 0,
  savedFileCount: 0,
  initialSavedFileCount: 0,
  orderId: "",
  cardTypeCount: 0,
};

describe("workExampleEditorHasContent", () => {
  it("пустая форма — можно закрыть без confirm", () => {
    expect(workExampleEditorHasContent(empty)).toBe(false);
  });

  it("кириллица в названии или заметке — есть содержание", () => {
    expect(
      workExampleEditorHasContent({
        ...empty,
        title: "Фиксация 29.08 до и после",
      }),
    ).toBe(true);
    expect(
      workExampleEditorHasContent({
        ...empty,
        tech: "коронка цирконий",
      }),
    ).toBe(true);
  });

  it("идёт загрузка — есть содержание", () => {
    expect(workExampleEditorHasContent({ ...empty, busy: true })).toBe(true);
  });

  it("ссылка или фото — есть содержание", () => {
    expect(
      workExampleEditorHasContent({
        ...empty,
        cloudUrls: ["https://disk.yandex.ru/d/cbZa2KJK1Suvdg"],
      }),
    ).toBe(true);
    expect(
      workExampleEditorHasContent({ ...empty, pendingCount: 1 }),
    ).toBe(true);
  });
});
