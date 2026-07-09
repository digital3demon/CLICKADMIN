import { describe, expect, it } from "vitest";
import {
  enrichCompositionHintsWithTeethFdi,
  extractTeethFdiFromOrderText,
} from "./order-text-teeth-fdi";

const remiKidsOrderText =
  "аппарат Марко Роса с опорой на 53, 55, 63, 65, титановый + крючки для лицевой маски";

describe("extractTeethFdiFromOrderText", () => {
  it("extracts support teeth from опорой на with Cyrillic around", () => {
    expect(extractTeethFdiFromOrderText(remiKidsOrderText)).toEqual([
      "53",
      "55",
      "63",
      "65",
    ]);
  });

  it("extracts teeth after зубы", () => {
    expect(extractTeethFdiFromOrderText("Коронка Emax на зубы 46, 47")).toEqual(["46", "47"]);
  });

  it("expands FDI range 12-22 plus 24 from вид работы", () => {
    expect(
      extractTeethFdiFromOrderText("Вид работы: 12-22, 24 ПММА, А3,5"),
    ).toEqual(["12", "11", "21", "22", "24"]);
  });

  it("does not treat delivery date as tooth numbers", () => {
    expect(
      extractTeethFdiFromOrderText(
        "аппарат Марко Роса с опорой на 53, 55. Дата сдачи аппарата 25\\07\\2026",
      ),
    ).toEqual(["53", "55"]);
  });
});

describe("enrichCompositionHintsWithTeethFdi", () => {
  it("fills teethFdi on apparatus hint when AI omitted them", () => {
    expect(
      enrichCompositionHintsWithTeethFdi(
        [{ nameHint: "Аппарат Марко Росса/HAAS титан", quantity: 1 }],
        remiKidsOrderText,
      ),
    ).toEqual([
      {
        nameHint: "Аппарат Марко Росса/HAAS титан",
        quantity: 1,
        teethFdi: ["53", "55", "63", "65"],
      },
    ]);
  });

  it("does not overwrite teethFdi already set by AI", () => {
    expect(
      enrichCompositionHintsWithTeethFdi(
        [{ nameHint: "Коронка Emax", quantity: 1, teethFdi: ["46"] }],
        remiKidsOrderText,
      ),
    ).toEqual([{ nameHint: "Коронка Emax", quantity: 1, teethFdi: ["46"] }]);
  });

  it("sets quantity from teeth for temporary crown hint", () => {
    const orderText = "Вид работы: 12-22, 24 ПММА, А3,5\nОснования Ультрастом";
    expect(
      enrichCompositionHintsWithTeethFdi(
        [{ nameHint: "Временная коронка композитная", quantity: 1 }],
        orderText,
      ),
    ).toEqual([
      {
        nameHint: "Временная коронка композитная",
        quantity: 5,
        teethFdi: ["12", "11", "21", "22", "24"],
      },
    ]);
  });
});
