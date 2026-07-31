/** Lab-wide tasks (orders list → «Задачи»). */

export const LAB_TASK_MAX_TEXT_LEN = 4000;
export const LAB_TASK_MAX_ATTACHMENTS = 8;
export const LAB_TASK_MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

export type LabTaskAttachmentJson = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
};

export type LabTaskJson = {
  id: string;
  text: string;
  authorLabel: string;
  createdAt: string;
  resolvedAt: string | null;
  resolvedByName: string | null;
  attachments: LabTaskAttachmentJson[];
};

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
