import { describe, expect, it } from "vitest";
import { replyTemplateImageOutputName } from "@/lib/mail/compress-image-for-email";

describe("replyTemplateImageOutputName", () => {
  it("меняет расширение на .jpg", () => {
    expect(replyTemplateImageOutputName("фото_клиники.PNG")).toBe("фото_клиники.jpg");
  });

  it("даёт имя по умолчанию для пустого ввода", () => {
    expect(replyTemplateImageOutputName(".png")).toBe("image.jpg");
  });
});
