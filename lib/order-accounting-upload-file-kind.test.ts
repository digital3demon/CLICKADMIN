import { describe, expect, it } from "vitest";
import {
  looksLikePaymentSlipFile,
  looksLikePaymentSlipFileDeep,
  looksLikePdfFile,
  looksLikePdfFileDeep,
} from "./order-accounting-upload-file-kind";

function fileWithBytes(
  bytes: Uint8Array,
  name: string,
  type: string,
): File {
  return new File([bytes], name, { type });
}

describe("looksLikePaymentSlipFile", () => {
  it("принимает изображение и PDF", () => {
    expect(
      looksLikePaymentSlipFile({
        name: "pay.png",
        type: "image/png",
      } as File),
    ).toBe(true);
    expect(
      looksLikePaymentSlipFile({
        name: "платежка.pdf",
        type: "application/pdf",
      } as File),
    ).toBe(true);
  });

  it("отклоняет прочие типы", () => {
    expect(
      looksLikePaymentSlipFile({
        name: "doc.docx",
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      } as File),
    ).toBe(false);
  });

  it("PDF счёта и платёжки используют один детектор pdf", () => {
    const pdf = { name: "x.pdf", type: "application/pdf" } as File;
    expect(looksLikePdfFile(pdf)).toBe(true);
    expect(looksLikePaymentSlipFile(pdf)).toBe(true);
  });

  it("распознаёт PDF по сигнатуре %PDF без расширения", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.4 bank");
    const f = fileWithBytes(bytes, "выписка", "application/octet-stream");
    expect(looksLikePdfFile(f)).toBe(false);
    expect(await looksLikePdfFileDeep(f)).toBe(true);
    expect(await looksLikePaymentSlipFileDeep(f)).toBe(true);
  });
});
