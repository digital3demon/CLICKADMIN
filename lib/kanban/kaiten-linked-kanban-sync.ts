import type { CardComment } from "@/lib/kanban/types";
import { kaitenJsonIntId } from "@/lib/kaiten-comment-parse";
import {
  CRM_UPLOAD_MAX_BYTES,
  formatCrmUploadMaxShortRu,
} from "@/lib/crm-upload-limits";
import { normalizeOrderAttachmentImage } from "@/lib/order-attachment-image-normalize.client";
import { requestOrderKaitenAttachmentSync } from "@/lib/order-kaiten-attachment-sync-client";

/** Совпадает с POST `/api/orders/[id]/attachments`. */
export const ORDER_ATTACHMENT_MAX_BYTES = CRM_UPLOAD_MAX_BYTES;

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
/**
 * Лента чата из CRM-канбана (GET /kanban-chat): сервер подмешивает Kaiten и пишет в tenant state.
 */
export async function fetchKanbanMirrorCommentsForOrder(
  orderId: string,
): Promise<{ ok: true; comments: CardComment[] } | { ok: false }> {
  try {
    const res = await fetch(`/api/orders/${orderId}/kanban-chat`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      hasCard?: boolean;
      comments?: CardComment[];
    };
    if (!res.ok || !Array.isArray(data.comments)) {
      return { ok: false };
    }
    if (data.comments.length === 0 && data.hasCard !== true) {
      return { ok: false };
    }
    return { ok: true, comments: data.comments };
  } catch {
    return { ok: false };
  }
}

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
        externalCommentId: String(kid),
        source: "KAITEN",
        syncStatus: "synced",
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

/**
 * Лабораторный срок из канбана → PATCH наряда → push шапки в Kaiten (через KAITEN_HEAD_PATCH_FIELDS).
 */
export async function patchOrderHeadFromKanban(
  orderId: string,
  body: { dueDate?: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const patch: Record<string, unknown> = {};
  if (body.dueDate !== undefined) {
    const v = body.dueDate?.trim() || null;
    patch.dueDate = v ? `${v}T09:00:00.000` : null;
    patch.kaitenAdminDueHasTime = false;
  }
  if (Object.keys(patch).length === 0) {
    return { ok: true };
  }
  try {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      kaitenTitleSyncError?: string | null;
    };
    if (!res.ok) {
      return { ok: false, error: data.error ?? "Не удалось сохранить наряд" };
    }
    if (data.kaitenTitleSyncError) {
      return { ok: false, error: data.kaitenTitleSyncError };
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
      error: `Файл больше ${formatCrmUploadMaxShortRu()} (лимит вложений наряда)`,
    };
  }
  try {
    let prepared: File;
    try {
      prepared = await normalizeOrderAttachmentImage(file);
    } catch (e) {
      return {
        ok: false,
        error:
          e instanceof Error ? e.message : "Не удалось подготовить изображение",
      };
    }
    const buf = await prepared.arrayBuffer();
    const res = await fetch(`/api/orders/${orderId}/attachments`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Upload-Filename": encodeURIComponent(prepared.name),
        "X-Upload-Mime": prepared.type || "application/octet-stream",
      },
      body: buf,
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; id?: string };
    if (!res.ok) {
      return { ok: false, error: data.error ?? "Не удалось загрузить файл к наряду" };
    }
    const id = typeof data.id === "string" ? data.id : "";
    if (!id) return { ok: false, error: "Сервер не вернул id вложения" };
    void requestOrderKaitenAttachmentSync(orderId);
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
