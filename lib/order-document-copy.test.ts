import { describe, expect, it } from "vitest";
import {
  formatDocumentCopyCompositionText,
  formatDocumentCopyMoneyRu,
  formatDocumentCopyOrderLegalText,
  formatDocumentCopyOrderLine,
} from "@/lib/order-document-copy";

describe("order-document-copy", () => {
  it("собирает строку заказа из номера, пациента и врача", () => {
    expect(
      formatDocumentCopyOrderLine({
        orderNumber: "2608-335",
        patientName: "Каленова Анна",
        doctorName: "Куприянова Ольга",
        patientShort: "Каленова А.",
        doctorShort: "Куприянова О.",
      }),
    ).toBe("2608-335 Каленова А. Куприянова О.");
  });

  it("копирует состав без подписей «кол-во» и «сумма», кириллица вокруг", () => {
    const text = formatDocumentCopyCompositionText([
      {
        title: "1002 · Сплинт Простой",
        quantity: 1,
        amountRub: 16000,
      },
    ]);
    expect(text).toBe(
      ["1002 · Сплинт Простой", "1", formatDocumentCopyMoneyRu(16000)].join(
        "\n",
      ),
    );
    expect(text).not.toMatch(/кол-во|сумма/u);
  });

  it("склеивает заказ, юрлицо и ИНН без состава", () => {
    const all = formatDocumentCopyOrderLegalText({
      orderLine: "2608-335 Каленова А. Куприянова О.",
      legalName: "ООО «ДИНАСТИЯ СТОМ»",
      inn: "1101178144",
    });
    expect(all).toBe(
      [
        "2608-335 Каленова А. Куприянова О.",
        "ООО «ДИНАСТИЯ СТОМ»",
        "1101178144",
      ].join("\n"),
    );
    expect(all).not.toContain("Сплинт");
  });
});
