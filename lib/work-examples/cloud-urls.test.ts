import { describe, expect, it } from "vitest";
import {
  parseWorkExampleCloudUrls,
  serializeWorkExampleCloudUrls,
  splitWorkExampleCloudUrlDraft,
} from "@/lib/work-examples/cloud-urls";

describe("work example cloud urls", () => {
  it("достаёт несколько URL среди кириллицы", () => {
    const text =
      "витрина Тындик https://disk.yandex.ru/d/папка_верх и https://drive.google.com/file/d/abc Невский";
    expect(parseWorkExampleCloudUrls(text)).toEqual([
      "https://disk.yandex.ru/d/папка_верх",
      "https://drive.google.com/file/d/abc",
    ]);
  });

  it("канон в БД — по строке, пустые выкидывает", () => {
    const raw = [
      "https://disk.yandex.ru/d/одна",
      "",
      "https://disk.yandex.ru/d/две",
    ].join("\n");
    expect(serializeWorkExampleCloudUrls(raw)).toBe(
      "https://disk.yandex.ru/d/одна\nhttps://disk.yandex.ru/d/две",
    );
  });

  it("черновик: одна ссылка не режется, две — раскладываются", () => {
    expect(splitWorkExampleCloudUrlDraft("https://disk.yandex.ru/d/черн")).toBeNull();
    expect(
      splitWorkExampleCloudUrlDraft(
        "https://a.example/раз https://b.example/два",
      ),
    ).toEqual(["https://a.example/раз", "https://b.example/два"]);
  });
});
