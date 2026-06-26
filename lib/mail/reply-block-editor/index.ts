export * from "./types";
export * from "./validate";
export * from "./render";
export { createEmptyBlock, newReplyBlockId } from "./validate";
export { createClickLabPreset, SAMPLE_ORDER_STATUS_URL } from "./presets/click-lab";

import type { ReplyEditorDocument, ReplyLayoutType } from "./types";
import { createClickLabPreset } from "./presets/click-lab";

export function parseEditorDocument(raw: unknown): ReplyEditorDocument | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1 || !Array.isArray(o.blocks)) return null;
  return raw as ReplyEditorDocument;
}

export function defaultEditorDocumentForLayout(layoutType: ReplyLayoutType): ReplyEditorDocument | null {
  if (layoutType === "blocks") return createClickLabPreset();
  return null;
}

export function resolveLayoutType(
  layoutType: string | null | undefined,
  htmlTemplate: string,
  editorDocument: unknown,
): ReplyLayoutType {
  if (layoutType === "freeform" || layoutType === "blocks") return layoutType;
  if (parseEditorDocument(editorDocument)) return "blocks";
  if (htmlTemplate.trim()) return "freeform";
  return "blocks";
}
