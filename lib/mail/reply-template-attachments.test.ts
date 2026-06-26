import { describe, expect, it } from "vitest";
import {
  collectReplyTemplateMailAttachments,
  extractCidsFromReplyHtml,
  normalizeReplyHtmlForSend,
  restoreReplyTemplateCidsFromPreview,
  substituteReplyTemplateCidsForPreview,
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

describe("substituteReplyTemplateCidsForPreview", () => {
  it("подменяет cid на URL для превью", () => {
    const html = '<img src="cid:reply-asset-a@crm" alt="logo">';
    const out = substituteReplyTemplateCidsForPreview(
      html,
      [{ id: "asset-1", contentId: "reply-asset-a@crm" }],
      "acc-1",
    );
    expect(out).toContain(
      "/api/mail/accounts/acc-1/reply-template/assets/asset-1?inline=1",
    );
  });
});

describe("restoreReplyTemplateCidsFromPreview", () => {
  it("возвращает cid перед отправкой", () => {
    const url =
      "/api/mail/accounts/acc-1/reply-template/assets/asset-1?inline=1";
    const html = `<img src="${url}" alt="logo">`;
    const out = restoreReplyTemplateCidsFromPreview(
      html,
      [{ id: "asset-1", contentId: "reply-asset-a@crm" }],
      "acc-1",
    );
    expect(out).toContain('src="cid:reply-asset-a@crm"');
    expect(out).toContain('width="240"');
    expect(out).not.toContain("logo");
  });
});

describe("normalizeReplyHtmlForSend", () => {
  it("убирает [имя-файла.png] и задаёт ширину inline-картинке", () => {
    const html =
      '<img src="cid:reply-asset-a@crm" alt="Click Lab logo-01.png"><p>Текст</p><p>[Click Lab logo-01.png]</p>';
    const out = normalizeReplyHtmlForSend(html, 180);
    expect(out).not.toContain("[Click Lab logo-01.png]");
    expect(out).toContain('width="180"');
    expect(out).toContain('style="width:180px');
    expect(out).toContain("<p>Текст</p>");
  });

  it("сохраняет заданную в шаблоне ширину", () => {
    const html =
      '<img src="cid:x@crm" width="320" style="width: 320px; height: auto;" alt="logo">';
    const out = normalizeReplyHtmlForSend(html);
    expect(out).toContain('width="320"');
    expect(out).toContain('style="width:320px');
  });
});
