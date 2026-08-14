import { describe, expect, it } from "vitest";
import {
  isCrmUsefulScannerQr,
  isManufacturerOrNoiseBarcode,
  parseScannerQrPayload,
  pickPreferredScannerQr,
} from "@/lib/scanner-qr-parse";

describe("parseScannerQrPayload", () => {
  it("разбирает hub URL с кириллицей до и после", () => {
    const raw =
      "наряд Гордиенко https://crm.example/p/t/clicklab/s/abc123def456 витрина";
    expect(parseScannerQrPayload(raw)).toEqual({
      kind: "hub",
      tenantSlug: "clicklab",
      token: "abc123def456",
    });
  });

  it("разбирает относительный путь витрины", () => {
    expect(parseScannerQrPayload("/p/t/my-lab/s/tok_99")).toEqual({
      kind: "hub",
      tenantSlug: "my-lab",
      token: "tok_99",
    });
  });

  it("разбирает legacy Kaiten URL clicklab", () => {
    const raw = "см. https://clicklab.kaiten.ru/68081570 конец";
    expect(parseScannerQrPayload(raw)).toEqual({
      kind: "kaiten",
      cardId: 68081570,
    });
  });

  it("разбирает QR целиком — только kaiten URL", () => {
    expect(parseScannerQrPayload("https://clicklab.kaiten.ru/68163039")).toEqual({
      kind: "kaiten",
      cardId: 68163039,
    });
  });

  it("разбирает QR целиком — hub", () => {
    expect(
      parseScannerQrPayload("https://lab.click-lab.online/p/t/demo/s/deadbeef"),
    ).toEqual({
      kind: "hub",
      tenantSlug: "demo",
      token: "deadbeef",
    });
  });

  it("пустой ввод → unknown", () => {
    expect(parseScannerQrPayload("")).toEqual({ kind: "unknown" });
    expect(parseScannerQrPayload("   ")).toEqual({ kind: "unknown" });
  });

  it("текст без URL → unknown", () => {
    expect(parseScannerQrPayload("Гордиенко Анна 2607-422")).toEqual({
      kind: "unknown",
    });
  });
});

describe("pickPreferredScannerQr", () => {
  const geoGs1 = "(01)08800028717599(10)260429-LS80(11)260429";

  it("игнорирует GS1 абатмента, берёт витрину", () => {
    const hub = "https://lab.click-lab.online/p/t/clicklab/s/tok_kal";
    expect(pickPreferredScannerQr([geoGs1, hub])).toBe(hub);
    expect(isManufacturerOrNoiseBarcode(geoGs1)).toBe(true);
    expect(isCrmUsefulScannerQr(geoGs1)).toBe(false);
  });

  it("голый номер наряда полезен", () => {
    expect(isCrmUsefulScannerQr("2608-156")).toBe(true);
    expect(pickPreferredScannerQr([geoGs1, "2608-156"])).toBe("2608-156");
  });

  it("один GS1 без витрины → пусто (не подсовывать производителя)", () => {
    expect(pickPreferredScannerQr([geoGs1])).toBeNull();
  });
});
