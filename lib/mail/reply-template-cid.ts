import type { MailSendAttachment } from "@/lib/mail/smtp-client";

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
