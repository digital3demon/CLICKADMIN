import type { MailSendAttachment } from "@/lib/mail/smtp-client";
import { DEFAULT_REPLY_TEMPLATE_IMAGE_WIDTH_PX } from "@/lib/mail/tiptap-resizable-image";

/** Плейсхолдеры вида [logo.png] из старого plain-text редактора. */
const IMAGE_FILENAME_BRACKET_RE =
  /\[[^\]]*\.(?:png|jpe?g|gif|webp|svg)(?:\s[^]]*)?\]/gi;

const IMAGE_FILENAME_BRACKET_PARAGRAPH_RE =
  /<p(?:\s[^>]*)?>\s*\[[^\]]*\.(?:png|jpe?g|gif|webp|svg)(?:\s[^]]*)?\]\s*<\/p>/gi;

export type ReplyTemplateAssetRow = {
  id: string;
  fileName: string;
  mimeType: string;
  kind: "INLINE_IMAGE" | "ATTACHMENT";
  contentId: string;
  data: Buffer;
};

export function normalizeReplyTemplateContentId(value: string | null | undefined): string {
  if (!value) return "";
  const stripped = value.trim().replace(/^<|>$/g, "");
  try {
    return decodeURIComponent(stripped).toLowerCase();
  } catch {
    return stripped.toLowerCase();
  }
}

export function buildReplyTemplateContentId(assetId: string): string {
  return `reply-asset-${assetId}@crm`;
}

/** CID из src="cid:..." в HTML шаблона. */
export function extractCidsFromReplyHtml(html: string): Set<string> {
  const found = new Set<string>();
  const re = /\s(?:src)\s*=\s*(?:"cid:([^"]+)"|'cid:([^']+)'|cid:([^\s>]+))/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const raw = match[1] ?? match[2] ?? match[3] ?? "";
    const cid = normalizeReplyTemplateContentId(raw);
    if (cid) found.add(cid);
  }
  return found;
}

export function substituteReplyTemplateCidsForPreview(
  html: string,
  assets: Array<{ id: string; contentId: string }>,
  accountId: string,
): string {
  const byCid = new Map<string, string>();
  for (const asset of assets) {
    const cid = normalizeReplyTemplateContentId(asset.contentId);
    if (!cid) continue;
    byCid.set(
      cid,
      `/api/mail/accounts/${encodeURIComponent(accountId)}/reply-template/assets/${encodeURIComponent(asset.id)}?inline=1`,
    );
  }
  if (byCid.size === 0) return html;

  return html
    .replace(/\s(src)\s*=\s*(["'])cid:([^"']+)\2/gi, (match, attr: string, quote: string, rawCid: string) => {
      const url = byCid.get(normalizeReplyTemplateContentId(rawCid));
      return url ? ` ${attr}=${quote}${url}${quote}` : match;
    })
    .replace(/\s(src)\s*=\s*cid:([^\s>]+)/gi, (match, attr: string, rawCid: string) => {
      const url = byCid.get(normalizeReplyTemplateContentId(rawCid));
      return url ? ` ${attr}="${url}"` : match;
    });
}

/** Перед сохранением шаблона: URL превью → cid: для SMTP. */
export function restoreReplyTemplateCidsFromPreview(
  html: string,
  assets: Array<{ id: string; contentId: string }>,
  accountId: string,
): string {
  let out = html;
  for (const asset of assets) {
    const url = `/api/mail/accounts/${encodeURIComponent(accountId)}/reply-template/assets/${encodeURIComponent(asset.id)}?inline=1`;
    out = out.split(url).join(`cid:${asset.contentId}`);
  }
  return normalizeReplyHtmlForSend(out);
}

function parseWidthFromImgAttrString(attrs: string): number | null {
  const widthAttr = attrs.match(/\bwidth\s*=\s*["']?(\d+)/i)?.[1];
  if (widthAttr && /^\d+$/.test(widthAttr)) return Number(widthAttr);
  const style = attrs.match(/\bstyle\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
  const px = /width:\s*(\d+)px/i.exec(style);
  if (px?.[1]) return Number(px[1]);
  return null;
}

function isInlineReplyImageSrc(attrs: string): boolean {
  return (
    /\bsrc\s*=\s*["']cid:/i.test(attrs) ||
    /reply-template\/assets\//i.test(attrs)
  );
}

/** Перед SMTP: убрать [имя-файла], задать width и пустой alt у inline-картинок. */
export function normalizeReplyHtmlForSend(
  html: string,
  defaultWidthPx = DEFAULT_REPLY_TEMPLATE_IMAGE_WIDTH_PX,
): string {
  let out = html.replace(IMAGE_FILENAME_BRACKET_PARAGRAPH_RE, "");
  out = out.replace(IMAGE_FILENAME_BRACKET_RE, "");

  out = out.replace(/<img\b([^>]*?)\/?>/gi, (full, attrs: string) => {
    if (!isInlineReplyImageSrc(attrs)) return full;
    const src = attrs.match(/\bsrc\s*=\s*(["'])([^"']+)\1/i)?.[2]?.trim();
    if (!src) return full;
    const width = parseWidthFromImgAttrString(attrs) ?? defaultWidthPx;
    const safeSrc = src.replace(/"/g, "&quot;");
    return `<img src="${safeSrc}" alt="" width="${width}" style="width:${width}px;height:auto;max-width:100%;display:block;" />`;
  });

  return out;
}

export function collectReplyTemplateMailAttachments(
  html: string,
  assets: ReplyTemplateAssetRow[],
): MailSendAttachment[] {
  const cidsInHtml = extractCidsFromReplyHtml(html);
  const out: MailSendAttachment[] = [];

  for (const asset of assets) {
    if (asset.kind === "ATTACHMENT") {
      out.push({
        filename: asset.fileName,
        contentType: asset.mimeType,
        content: asset.data,
      });
      continue;
    }
    const cidNorm = normalizeReplyTemplateContentId(asset.contentId);
    if (!cidNorm || !cidsInHtml.has(cidNorm)) continue;
    out.push({
      filename: asset.fileName,
      contentType: asset.mimeType,
      content: asset.data,
      cid: asset.contentId,
    });
  }

  return out;
}
