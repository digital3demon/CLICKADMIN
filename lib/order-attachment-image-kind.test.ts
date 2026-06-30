import { describe, expect, it } from "vitest";
import {
  isHeicLikeOrderImage,
  isOrderAttachmentImageFile,
} from "@/lib/order-attachment-image-kind";
import {
  orderAttachmentImageOutputName,
  shouldNormalizeOrderAttachmentImage,
} from "@/lib/order-attachment-image-normalize.client";

describe("isOrderAttachmentImageFile", () => {
  it("распознаёт HEIC по расширению", () => {
    expect(
      isOrderAttachmentImageFile({ type: "", name: "IMG_1234.HEIC" }),
    ).toBe(true);
  });
});

describe("shouldNormalizeOrderAttachmentImage", () => {
  it("не трогает небольшой PNG-скриншот", () => {
    expect(
      shouldNormalizeOrderAttachmentImage({
        type: "image/png",
        name: "скрин.png",
        size: 400_000,
      }),
    ).toBe(false);
  });

  it("сжимает крупное фото с камеры", () => {
    expect(
      shouldNormalizeOrderAttachmentImage({
        type: "image/jpeg",
        name: "DSC_0001.jpg",
        size: 8 * 1024 * 1024,
      }),
    ).toBe(true);
  });

  it("конвертирует HEIC даже при небольшом размере", () => {
    expect(
      shouldNormalizeOrderAttachmentImage({
        type: "image/heic",
        name: "фото.heic",
        size: 900_000,
      }),
    ).toBe(true);
    expect(isHeicLikeOrderImage({ type: "image/heic", name: "a.heic" })).toBe(true);
  });
});

describe("orderAttachmentImageOutputName", () => {
  it("меняет расширение на .jpg", () => {
    expect(orderAttachmentImageOutputName("наряд 178 от 10.02.2026.heic")).toBe(
      "наряд 178 от 10.02.2026.jpg",
    );
  });
});
