import { describe, expect, it } from "vitest";
import {
  looksLikePaymentSlipFile,
  looksLikePdfFile,
} from "./order-accounting-upload-file-kind";

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
});
