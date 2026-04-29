import type { CardComment } from "@/lib/kanban/types";
import { kaitenJsonIntId } from "@/lib/kaiten-comment-parse";

/** Лимит тела POST /api/orders/[id]/attachments (сырой файл). */
export const ORDER_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

type KaitenSnapshotComment = {
  id?: number;
  text?: string;
  created?: string;
  authorName?: string;
  parentId?: number | null;
};

/**
 * Комментарии карточки из того же снимка Kaiten, что и вкладка наряда «Kaiten».
 * `displayUserId` — запасной userId для верстки; подпись берётся из `authorLabel`.
 */
export async function fetchOrderKaitenCommentsForKanban(
  orderId: string,
  displayUserId: string,
  opts?: { refresh?: boolean },
): Promise<{ ok: true; comments: CardComment[] } | { ok: false }> {
  try {
    const bust = opts?.refresh ? `?t=${Date.now()}` : "";
    const res = await fetch(`/api/orders/${orderId}/kaiten/chat${bust}`, {
      credentials: "include",
    });
    const data = (await res.json().catch(() => ({}))) as {
      comments?: unknown;
    };
    if (!res.ok) return { ok: false };
    const raw = data.comments;
    const rows = Array.isArray(raw) ? (raw as KaitenSnapshotComment[]) : [];
    const byKaitenId = new Map<number, CardComment>();
    for (const r of rows) {
      const kid = kaitenJsonIntId(r.id);
      if (kid == null) continue;
      if (byKaitenId.has(kid)) continue;
      let createdAt = "";
      if (typeof r.created === "string" && r.created.trim()) {
        const d = new Date(r.created);
        createdAt = Number.isNaN(d.getTime())
          ? new Date().toISOString()
          : d.toISOString();
      } else {
        createdAt = new Date().toISOString();
      }
      const author =
        typeof r.authorName === "string" && r.authorName.trim()
          ? r.authorName.trim()
          : undefined;
      byKaitenId.set(kid, {
        id: `kt-${kid}`,
        userId: displayUserId,
        text: typeof r.text === "string" ? r.text : "",
        createdAt,
        ...(author ? { authorLabel: author } : {}),
      });
    }
    const comments = [...byKaitenId.values()];
    return { ok: true, comments };
  } catch {
    return { ok: false };
  }
}

export async function postOrderKaitenComment(
  orderId: string,
  text: string,
  parentCommentId?: number | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/orders/${orderId}/kaiten/comments`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        ...(parentCommentId != null && Number.isFinite(parentCommentId)
          ? { parentCommentId }
          : {}),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      return { ok: false, error: data.error ?? "Комментарий не отправлен в Kaiten" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Сеть недоступна" };
  }
}

export async function patchOrderKaitenCard(
  orderId: string,
  body: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/orders/${orderId}/kaiten`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      return { ok: false, error: data.error ?? "Kaiten не принял изменения" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Сеть недоступна" };
  }
}

export async function uploadOrderAttachmentFromFile(
  orderId: string,
  file: File,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (file.size > ORDER_ATTACHMENT_MAX_BYTES) {
    return {
      ok: false,
      error: `Файл больше ${Math.round(ORDER_ATTACHMENT_MAX_BYTES / 1024 / 1024)} МБ (лимит вложений наряда)`,
    };
  }
  try {
    const buf = await file.arrayBuffer();
    const res = await fetch(`/api/orders/${orderId}/attachments`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Upload-Filename": encodeURIComponent(file.name),
        "X-Upload-Mime": file.type || "application/octet-stream",
      },
      body: buf,
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; id?: string };
    if (!res.ok) {
      return { ok: false, error: data.error ?? "Не удалось загрузить файл к наряду" };
    }
    const id = typeof data.id === "string" ? data.id : "";
    if (!id) return { ok: false, error: "Сервер не вернул id вложения" };
    return { ok: true, id };
  } catch {
    return { ok: false, error: "Сеть недоступна" };
  }
}

export async function deleteOrderAttachmentById(
  orderId: string,
  attachmentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/orders/${orderId}/attachments/${attachmentId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: data.error ?? "Не удалось удалить вложение" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Сеть недоступна" };
  }
}
