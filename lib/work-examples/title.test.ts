import { describe, expect, it } from "vitest";
import { parseWorkExampleTitle } from "@/lib/work-examples/constants";
import { workExampleDisplayTitle } from "@/components/work-examples/types";

describe("work example title", () => {
  it("режет пробелы, кириллица до и после сохраняется", () => {
    expect(parseWorkExampleTitle("  коронка Zr  Малинина  ")).toBe("коронка Zr Малинина");
    expect(parseWorkExampleTitle("")).toBe("");
  });

  it("на плитке своё имя важнее номера наряда", () => {
    expect(
      workExampleDisplayTitle({
        title: "Винир Невский",
        orderNumber: "2608-389",
        unassigned: false,
      }),
    ).toBe("Винир Невский");
    expect(
      workExampleDisplayTitle({
        title: "",
        orderNumber: "2608-389",
        unassigned: false,
      }),
    ).toBe("2608-389");
  });
});
