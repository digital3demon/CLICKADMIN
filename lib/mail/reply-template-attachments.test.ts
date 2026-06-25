import { describe, expect, it } from "vitest";
import {
  collectReplyTemplateMailAttachments,
  extractCidsFromReplyHtml,
} from "./reply-template-cid";

describe("extractCidsFromReplyHtml", () => {
  it("находит cid в src", () => {
    const cids = extractCidsFromReplyHtml(
      '<p><img src="cid:reply-asset-abc@crm" alt="logo"></p>',
    );
    expect(cids.has("reply-asset-abc@crm")).toBe(true);
  });
});

describe("collectReplyTemplateMailAttachments", () => {
  const buffer = Buffer.from("x");

  it("прикрепляет inline по cid и все ATTACHMENT", () => {
    const html = '<img src="cid:reply-asset-a@crm" />';
    const attachments = collectReplyTemplateMailAttachments(html, [
      {
        id: "a",
        fileName: "logo.png",
        mimeType: "image/png",
        kind: "INLINE_IMAGE",
        contentId: "reply-asset-a@crm",
        data: buffer,
      },
      {
        id: "b",
        fileName: "price.pdf",
        mimeType: "application/pdf",
        kind: "ATTACHMENT",
        contentId: "reply-asset-b@crm",
        data: buffer,
      },
    ]);
    expect(attachments).toHaveLength(2);
    expect(attachments[0]?.cid).toBe("reply-asset-a@crm");
    expect(attachments[1]?.cid).toBeUndefined();
    expect(attachments[1]?.filename).toBe("price.pdf");
  });
});
