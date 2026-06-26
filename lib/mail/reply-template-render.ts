import type { EmailReplyTemplateContext } from "@/lib/mail/email-reply-template";
import {
  createClickLabPreset,
  parseEditorDocument,
  renderReplyBlocksHtml,
  resolveLayoutType,
  type ReplyEditorDocument,
  type ReplyLayoutType,
  type ReplyPreflightOverrides,
} from "@/lib/mail/reply-block-editor";

export type ReplyTemplateAssetForRender = {
  id: string;
  contentId: string;
};

export function buildHtmlFromReplyTemplate(
  layoutType: ReplyLayoutType,
  htmlTemplate: string,
  editorDocument: unknown,
  context: EmailReplyTemplateContext,
  assets: ReplyTemplateAssetForRender[],
  overrides?: ReplyPreflightOverrides | null,
): string {
  if (layoutType === "freeform") {
    return htmlTemplate;
  }
  const doc = parseEditorDocument(editorDocument) ?? createClickLabPreset();
  return renderReplyBlocksHtml(doc, context, assets, overrides);
}

export function normalizeEditorDocumentInput(
  layoutType: ReplyLayoutType,
  editorDocument: unknown,
): ReplyEditorDocument | null {
  if (layoutType !== "blocks") return null;
  return parseEditorDocument(editorDocument) ?? createClickLabPreset();
}

export { resolveLayoutType, parseEditorDocument };
