import { describe, expect, it } from "vitest";
import {
  crmDumpAttachmentExt,
  isCrmDumpImageAttachment,
} from "@/lib/crm-dump/attachment-kinds";

describe("crm-dump attachment-kinds", () => {
  it("принимает jpeg/png по mime", () => {
    expect(
      isCrmDumpImageAttachment({ mimeType: "image/jpeg", fileName: "a.pdf" }),
    ).toBe(true);
    expect(
      isCrmDumpImageAttachment({ mimeType: "image/png", fileName: "x" }),
    ).toBe(true);
  });

  it("отбрасывает pdf и doc", () => {
    expect(
      isCrmDumpImageAttachment({
        mimeType: "application/pdf",
        fileName: "scan.pdf",
      }),
    ).toBe(false);
    expect(
      isCrmDumpImageAttachment({
        mimeType: "application/msword",
        fileName: "a.doc",
      }),
    ).toBe(false);
  });

  it("распознаёт картинку по расширению имени", () => {
    expect(
      isCrmDumpImageAttachment({ mimeType: "", fileName: "фото.JPG" }),
    ).toBe(true);
  });

  it("ext для zip", () => {
    expect(crmDumpAttachmentExt("image/png", "a")).toBe("png");
    expect(crmDumpAttachmentExt("image/jpeg", "a")).toBe("jpg");
  });
});
