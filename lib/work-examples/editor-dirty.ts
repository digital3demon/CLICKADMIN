/**
 * Модалка примера: закрытие по фону без confirm только если форма пустая.
 */

export function workExampleEditorHasContent(input: {
  title: string;
  tech: string;
  doc: string;
  cloudUrls: readonly string[];
  pendingCount: number;
  savedFileCount: number;
  initialSavedFileCount: number;
  orderId: string;
  cardTypeCount: number;
  busy?: boolean;
}): boolean {
  if (input.busy) return true;
  if (input.title.trim()) return true;
  if (input.tech.trim() || input.doc.trim()) return true;
  if (input.cloudUrls.some((u) => u.trim().length > 0)) return true;
  if (input.pendingCount > 0) return true;
  if (input.savedFileCount > input.initialSavedFileCount) return true;
  if (input.orderId.trim()) return true;
  if (input.cardTypeCount > 0) return true;
  return false;
}
