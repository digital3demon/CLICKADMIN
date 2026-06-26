import type { EmailReplyTemplateContext } from "@/lib/mail/email-reply-template";
import { renderEmailReplyTemplate } from "@/lib/mail/email-reply-template";
import { normalizeReplyHtmlForSend } from "@/lib/mail/reply-template-cid";
import type {
  BlockStyle,
  ButtonVariant,
  ReplyBlock,
  ReplyBlockAssetRef,
  ReplyButtonDef,
  ReplyEditorDocument,
  ReplyPreflightOverrides,
} from "./types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function substitute(template: string, context: EmailReplyTemplateContext): string {
  return renderEmailReplyTemplate(template, context, { html: true });
}

function assetById(
  assets: ReplyBlockAssetRef[],
  assetId: string | null | undefined,
): ReplyBlockAssetRef | undefined {
  if (!assetId?.trim()) return undefined;
  return assets.find((a) => a.id === assetId);
}

function styleAttr(style: BlockStyle | undefined, globalFont?: string): string {
  const parts: string[] = [];
  if (style?.backgroundColor) parts.push(`background-color:${style.backgroundColor}`);
  if (style?.textColor) parts.push(`color:${style.textColor}`);
  const pad = style?.paddingPx ?? 16;
  parts.push(`padding:${pad}px`);
  if (style?.fontSizePx) parts.push(`font-size:${style.fontSizePx}px`);
  const font = style?.fontFamily || globalFont;
  if (font) parts.push(`font-family:${font}`);
  const align = style?.align;
  if (align) parts.push(`text-align:${align}`);
  return parts.join(";");
}

function textToParagraphsHtml(text: string, context: EmailReplyTemplateContext): string {
  const substituted = substitute(text, context);
  const paragraphs = substituted.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length === 0) return "";
  return paragraphs
    .map((paragraph) => {
      const inner = paragraph
        .split(/\n/)
        .map((line) => escapeHtml(line))
        .join("<br>");
      return `<p style="margin:0 0 12px 0;line-height:1.5;">${inner}</p>`;
    })
    .join("");
}

function buttonHref(btn: ReplyButtonDef, context: EmailReplyTemplateContext): string {
  if (btn.action.type === "tel") {
    const phone = btn.action.phone.trim().replace(/[^\d+]/g, "");
    return `tel:${phone}`;
  }
  const href = btn.action.type === "url" || btn.action.type === "download" ? btn.action.href : "";
  return substitute(href, context);
}

function renderButton(
  btn: ReplyButtonDef,
  context: EmailReplyTemplateContext,
  blockStyle: BlockStyle | undefined,
): string {
  const href = escapeHtml(buttonHref(btn, context));
  const label = escapeHtml(substitute(btn.label, context));
  const radius = blockStyle?.buttonRadiusPx ?? 8;
  const fontSize = blockStyle?.buttonFontSizePx ?? 15;
  const padX = blockStyle?.buttonPaddingXPx ?? 20;
  const padY = blockStyle?.buttonPaddingYPx ?? 12;
  let bg = blockStyle?.buttonBgColor ?? "#2563eb";
  let color = blockStyle?.buttonTextColor ?? "#ffffff";
  let border = "none";
  if (btn.variant === "secondary") {
    bg = "#ffffff";
    color = blockStyle?.buttonBgColor ?? "#2563eb";
    border = `2px solid ${blockStyle?.buttonBgColor ?? "#2563eb"}`;
  } else if (btn.variant === "outline") {
    bg = "transparent";
    color = blockStyle?.buttonTextColor ?? "#111827";
    border = `2px solid ${blockStyle?.textColor ?? "#d1d5db"}`;
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 4px;display:inline-table;">
<tr><td align="center" style="border-radius:${radius}px;background-color:${bg};border:${border};">
<a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:${padY}px ${padX}px;font-size:${fontSize}px;font-weight:600;color:${color};text-decoration:none;border-radius:${radius}px;">${label}</a>
</td></tr></table>`;
}

function renderBlock(
  block: ReplyBlock,
  context: EmailReplyTemplateContext,
  assets: ReplyBlockAssetRef[],
  globalFont?: string,
): string {
  const tdStyle = styleAttr(block.style, globalFont);
  switch (block.type) {
    case "hero": {
      const logo = assetById(assets, block.logoAssetId);
      const logoW = block.logoWidthPx ?? 200;
      const logoHtml = logo
        ? `<img src="cid:${escapeHtml(logo.contentId)}" alt="" width="${logoW}" style="width:${logoW}px;height:auto;max-width:100%;display:block;margin:0 auto 16px;" />`
        : "";
      const headline = escapeHtml(substitute(block.headline, context));
      const subtitle = block.subtitle?.trim()
        ? `<p style="margin:8px 0 0;font-size:15px;line-height:1.4;opacity:0.85;">${escapeHtml(substitute(block.subtitle, context))}</p>`
        : "";
      return `<tr data-reply-block-id="${escapeHtml(block.id)}"><td style="${tdStyle}">${logoHtml}<h1 style="margin:0;font-size:${block.style?.fontSizePx ?? 22}px;line-height:1.25;font-weight:700;">${headline}</h1>${subtitle}</td></tr>`;
    }
    case "text":
      return `<tr data-reply-block-id="${escapeHtml(block.id)}"><td style="${tdStyle}">${textToParagraphsHtml(block.content, context)}</td></tr>`;
    case "buttons": {
      const buttonsHtml = block.buttons
        .map((btn) => renderButton(btn, context, block.style))
        .join("");
      return `<tr data-reply-block-id="${escapeHtml(block.id)}"><td style="${tdStyle}">${buttonsHtml}</td></tr>`;
    }
    case "image": {
      const asset = assetById(assets, block.assetId);
      if (!asset) return "";
      const w = block.widthPx || 240;
      const align = block.align ?? "center";
      return `<tr data-reply-block-id="${escapeHtml(block.id)}"><td style="${tdStyle}"><img src="cid:${escapeHtml(asset.contentId)}" alt="" width="${w}" style="width:${w}px;height:auto;max-width:100%;display:block;margin:0 auto;" align="${align}" /></td></tr>`;
    }
    case "divider": {
      const h = block.heightPx || 16;
      const color = block.color ?? "#e5e7eb";
      return `<tr data-reply-block-id="${escapeHtml(block.id)}"><td style="height:${h}px;line-height:${h}px;font-size:0;background-color:${color};">&nbsp;</td></tr>`;
    }
    case "attach_hint":
      return `<tr data-reply-block-id="${escapeHtml(block.id)}"><td style="${tdStyle}"><p style="margin:0;line-height:1.4;">${escapeHtml(substitute(block.text, context))}</p></td></tr>`;
    case "footer": {
      const links = (block.links ?? [])
        .map(
          (l) =>
            `<a href="${escapeHtml(substitute(l.href, context))}" style="color:inherit;margin:0 6px;">${escapeHtml(substitute(l.label, context))}</a>`,
        )
        .join("");
      return `<tr data-reply-block-id="${escapeHtml(block.id)}"><td style="${tdStyle}"><p style="margin:0 0 8px;line-height:1.4;">${escapeHtml(substitute(block.text, context))}</p>${links ? `<p style="margin:0;">${links}</p>` : ""}</td></tr>`;
    }
    default:
      return "";
  }
}

export function applyPreflightOverrides(
  document: ReplyEditorDocument,
  overrides?: ReplyPreflightOverrides | null,
): ReplyEditorDocument {
  if (!overrides) return document;
  const textOverrides = overrides.textOverrides ?? {};
  const headlineOverrides = overrides.headlineOverrides ?? {};
  return {
    ...document,
    blocks: document.blocks.map((block) => {
      if (block.type === "text" && textOverrides[block.id] !== undefined) {
        return { ...block, content: textOverrides[block.id]! };
      }
      if (block.type === "hero" && headlineOverrides[block.id] !== undefined) {
        return { ...block, headline: headlineOverrides[block.id]! };
      }
      return block;
    }),
  };
}

export function renderReplyBlocksHtml(
  document: ReplyEditorDocument,
  context: EmailReplyTemplateContext,
  assets: ReplyBlockAssetRef[],
  overrides?: ReplyPreflightOverrides | null,
): string {
  const doc = applyPreflightOverrides(document, overrides);
  const width = doc.global?.contentWidthPx ?? 600;
  const globalFont = doc.global?.fontFamily;
  const rows = doc.blocks
    .map((block) => renderBlock(block, context, assets, globalFont))
    .filter(Boolean)
    .join("");
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#f3f4f6;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f3f4f6;">
<tr><td align="center" style="padding:16px 8px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${width}" style="max-width:${width}px;width:100%;background-color:#ffffff;border-collapse:collapse;">
${rows}
</table>
</td></tr>
</table>
</body></html>`;
  return normalizeReplyHtmlForSend(html);
}

export function renderSingleReplyBlockHtml(
  block: ReplyBlock,
  context: EmailReplyTemplateContext,
  assets: ReplyBlockAssetRef[],
  opts?: { globalFont?: string; contentWidthPx?: number },
): string {
  const row = renderBlock(block, context, assets, opts?.globalFont);
  if (!row) return "";
  const width = opts?.contentWidthPx ?? 600;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${width}" style="max-width:100%;width:100%;border-collapse:collapse;background-color:#ffffff;">${row}</table>`;
}

export function getEditablePreflightBlocks(document: ReplyEditorDocument): ReplyBlock[] {
  return document.blocks.filter(
    (b) =>
      (b.type === "text" && b.editableInPreflight) ||
      (b.type === "hero" && b.editableHeadlineInPreflight),
  );
}
