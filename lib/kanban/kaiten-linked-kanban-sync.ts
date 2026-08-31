import type { CardComment } from "@/lib/kanban/types";
import { kaitenJsonIntId } from "@/lib/kaiten-comment-parse";
import {
  CRM_UPLOAD_MAX_BYTES,
  formatCrmUploadMaxShortRu,
} from "@/lib/crm-upload-limits";
import { postOrderAttachmentWithRetries } from "@/lib/order-attachment-upload-client";
import { isKaitenIntegrationDisabledResponse } from "@/lib/kanban/kaiten-client-disabled";

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
 * Лента и описание из CRM (GET /kanban-chat?local=1).
 * Ответ сразу из store/наряда; Kaiten модалка тянет отдельно.
 */
export async function fetchKanbanMirrorCommentsForOrder(
  orderId: string,
): Promise<
  | {
      ok: true;
      comments: CardComment[];
      description: string;
      linkedKaiten: boolean;
      cardImages: KaitenChatImageLite[];
    }
  | { ok: false }
> {
  try {
    const res = await fetch(`/api/orders/${orderId}/kanban-chat?local=1`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      hasCard?: boolean;
      comments?: CardComment[];
      cardImages?: KaitenChatImageLite[];
      description?: string;
      linkedKaiten?: boolean;
      orderHeader?: { description?: string; kaitenCardId?: number | null };
    };
    if (!res.ok || !Array.isArray(data.comments)) {
      return { ok: false };
    }
    const description =
      typeof data.description === "string"
        ? data.description
        : typeof data.orderHeader?.description === "string"
          ? data.orderHeader.description
          : "";
    const headerKid = data.orderHeader?.kaitenCardId;
    const linkedKaiten =
      data.linkedKaiten === true ||
      (headerKid != null && Number.isFinite(headerKid));
    const cardImages = (Array.isArray(data.cardImages) ? data.cardImages : [])
      .filter((img) => img && String(img.id || "").trim() && String(img.url || "").trim())
      .map((img) => ({
        id: String(img.id),
        name: String(img.name || "image.png"),
        url: String(img.url),
        mime: img.mime ?? null,
      }));
    return {
      ok: true,
      comments: data.comments,
      description,
      linkedKaiten,
      cardImages,
    };
  } catch {
    return { ok: false };
  }
}

export async function fetchOrderKaitenCardHeadForKanban(
  orderId: string,
): Promise<
  | {
      ok: true;
      assignees: string[];
      participants: string[];
      stageDue: string;
      urgent: boolean;
    }
  | { ok: false }
> {
  try {
    const res = await fetch(`/api/orders/${orderId}/kaiten/card-head`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      assignees?: unknown;
      participants?: unknown;
      stageDue?: unknown;
      urgent?: unknown;
    };
    if (!res.ok) return { ok: false };
    const assignees = Array.isArray(data.assignees)
      ? data.assignees.filter((x): x is string => typeof x === "string")
      : [];
    const participants = Array.isArray(data.participants)
      ? data.participants.filter((x): x is string => typeof x === "string")
      : [];
    return {
      ok: true,
      assignees,
      participants,
      stageDue: typeof data.stageDue === "string" ? data.stageDue : "",
      urgent: data.urgent === true,
    };
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
 * Лабораторный срок наряда из канбана → PATCH `/api/orders/:id` (Order.dueDate).
 * Не пишет Kaiten `due_date` (срок карточки канбана) и не трогает дату записи.
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
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
      kaitenIntegrationEnabled?: boolean;
    };
    if (!res.ok) {
      if (isKaitenIntegrationDisabledResponse(res.status, data)) {
        return { ok: true };
      }
      return { ok: false, error: data.error ?? "Kaiten не принял изменения" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Сеть недоступна" };
  }
}

export type KaitenChatImageLite = {
  id: string;
  name: string;
  url: string;
  mime?: string | null;
};

/**
 * Снимок Kaiten: cardImages + картинки из комментариев (для канбан-модалки).
 */
export async function fetchOrderKaitenImagesForKanban(
  orderId: string,
  opts?: { refresh?: boolean },
): Promise<
  | { ok: true; images: KaitenChatImageLite[]; blocked: boolean | null }
  | { ok: false }
> {
  try {
    const q = opts?.refresh ? "?refresh=1" : "";
    const res = await fetch(`/api/orders/${orderId}/kaiten${q}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      cardImages?: KaitenChatImageLite[];
      comments?: Array<{ images?: KaitenChatImageLite[] }>;
      card?: Record<string, unknown>;
    };
    if (!res.ok) return { ok: false };
    const images: KaitenChatImageLite[] = [];
    const seen = new Set<string>();
    const push = (img: KaitenChatImageLite | undefined) => {
      if (!img?.url) return;
      const key = img.url;
      if (seen.has(key)) return;
      seen.add(key);
      images.push({
        id: String(img.id || key),
        name: String(img.name || "image.png"),
        url: img.url,
        mime: img.mime ?? null,
      });
    };
    for (const img of data.cardImages || []) push(img);
    for (const c of data.comments || []) {
      for (const img of c.images || []) push(img);
    }
    let blocked: boolean | null = null;
    if (data.card && typeof data.card === "object") {
      const raw = data.card.blocked ?? data.card.is_blocked;
      if (raw === false || raw === 0 || raw === "false") blocked = false;
      else if (raw === true || raw === 1 || raw === "true") blocked = true;
    }
    return { ok: true, images, blocked };
  } catch {
    return { ok: false };
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
  const up = await postOrderAttachmentWithRetries(orderId, file, {
    uploadContext: "kanban",
    syncKaitenAfter: true,
  });
  if (!up.ok) {
    return { ok: false, error: up.error };
  }
  const id = typeof up.data.id === "string" ? up.data.id : "";
  if (!id) return { ok: false, error: "Сервер не вернул id вложения" };
  return { ok: true, id };
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
