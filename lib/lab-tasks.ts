/** Lab-wide notes: «Задачи» и «Забрать из» на списке заказов. */

export const LAB_TASK_MAX_TEXT_LEN = 4000;
export const LAB_TASK_MAX_ATTACHMENTS = 8;
export const LAB_TASK_MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

export type LabTaskKind = "TASK" | "PICKUP_FROM";

export type LabTaskAttachmentJson = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
};

export type LabTaskJson = {
  id: string;
  kind: LabTaskKind;
  text: string;
  authorLabel: string;
  createdAt: string;
  resolvedAt: string | null;
  resolvedByName: string | null;
  attachments: LabTaskAttachmentJson[];
  chatMessageCount: number;
  hasUnreadChat: boolean;
};

/** Query/API: task | pickup_from */
export function parseLabTaskKindParam(
  raw: string | null | undefined,
): LabTaskKind {
  const v = String(raw || "")
    .trim()
    .toLowerCase();
  if (v === "pickup_from" || v === "pickup" || v === "pickups") {
    return "PICKUP_FROM";
  }
  return "TASK";
}

export function labTaskKindToQuery(kind: LabTaskKind): string {
  return kind === "PICKUP_FROM" ? "pickup_from" : "task";
}

export function labTaskAttachmentUrl(taskId: string, attachmentId: string): string {
  return `/api/lab-tasks/${encodeURIComponent(taskId)}/attachments/${encodeURIComponent(attachmentId)}`;
}

export function isAllowedLabTaskImageMime(mime: string): boolean {
  const m = mime.trim().toLowerCase();
  return (
    m === "image/jpeg" ||
    m === "image/jpg" ||
    m === "image/png" ||
    m === "image/webp" ||
    m === "image/gif"
  );
}
