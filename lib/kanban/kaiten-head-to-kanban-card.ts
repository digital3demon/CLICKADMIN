/**
 * Срок карточки канбана ↔ Kaiten `due_date`.
 * Не лабораторный срок наряда (`Order.dueDate`) и не дата записи (`appointmentDate`).
 * Календарный день — Europe/Moscow: UTC-полуночь часто сдвигает YYYY-MM-DD накануне.
 */
import { formatYmdInMsk } from "@/lib/msk-calendar";
import type { KanbanAppState } from "@/lib/kanban/types";
import {
  forEachKanbanCardInState,
  getKanbanStageDue,
  normalizeKanbanStageDueDate,
  setKanbanStageDue,
} from "@/lib/kanban/kanban-stage-due";
import { shouldSkipInboundKanbanStageDue } from "@/lib/kanban/optimistic-kaiten-stage-due";
import { shouldKeepLocalKanbanStageDue } from "@/lib/kanban/preserve-kanban-card-head";
import { kaitenBlockedMetaFromCard } from "@/lib/kaiten-card-block";
import { listPendingKanbanBlocks, pendingBlockForOrder } from "@/lib/kanban/pending-kanban-blocks";

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

/** GET /cards/:id иногда `{ data: { due_date, asap, ... } }`. */
export function unwrapKaitenCardPayload(
  raw: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const inner = raw.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    const nested = inner as Record<string, unknown>;
    const rawLooksLikeCard =
      "board_id" in raw ||
      "due_date" in raw ||
      "asap" in raw ||
      "column_id" in raw ||
      "blocked" in raw ||
      "block_reason" in raw;
    if (!rawLooksLikeCard) return nested;
  }
  return raw;
}

function dueRawFromCard(card: Record<string, unknown>): {
  found: boolean;
  value: unknown;
} {
  if ("due_date" in card) return { found: true, value: card.due_date };
  if ("dueDate" in card) return { found: true, value: card.dueDate };
  return { found: false, value: undefined };
}

/** due_date из Kaiten → YYYY-MM-DD (календарь МСК). */
export function ymdFromKaitenDueDate(raw: unknown): string | null {
  if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    return (
      ymdFromKaitenDueDate(o.date) ??
      ymdFromKaitenDueDate(o.datetime) ??
      ymdFromKaitenDueDate(o.value) ??
      ymdFromKaitenDueDate(o.due_date)
    );
  }
  if (raw == null || raw === false) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const ms = raw > 0 && raw < 1e12 ? raw * 1000 : raw;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : formatYmdInMsk(d);
  }
  const s = String(raw).trim();
  if (!s) return null;
  if (YMD_RE.test(s)) return s;
  if (/^\d{10,13}$/.test(s)) {
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    const ms = n < 1e12 ? n * 1000 : n;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : formatYmdInMsk(d);
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return formatYmdInMsk(d);
}

/** PATCH Kaiten: дата без времени (`due_date_time_present: false`), стена МСК. */
export function kaitenDueDatePatchFromYmd(ymd: string | null | undefined): {
  due_date: string | null;
  due_date_time_present: boolean;
} {
  const n = normalizeKanbanStageDueDate(ymd);
  if (!n || !YMD_RE.test(n)) {
    return { due_date: null, due_date_time_present: false };
  }
  return {
    due_date: `${n}T00:00:00.000+03:00`,
    due_date_time_present: false,
  };
}

type KanbanHeadTarget = {
  urgent: boolean;
  stageDueDate?: string;
  dueDate?: string;
  linkedOrderId?: string;
  blocked?: boolean;
  blockReason?: string;
  blockedAt?: string;
  blockedByUserId?: string;
};

/**
 * asap / due_date / блок → карточка канбана.
 * Вызывается с кнопки «Обновить» (единственный откат на Kaiten).
 * asap ≠ `Order.isUrgent` (срочно наряда).
 */
export function applyKaitenHeadFieldsToKanbanCard(
  card: KanbanHeadTarget,
  kaitenCard: Record<string, unknown>,
): boolean {
  const src = unwrapKaitenCardPayload(kaitenCard) ?? kaitenCard;
  let changed = false;
  if ("asap" in src) {
    const asap = src.asap === true;
    if (card.urgent !== asap) {
      card.urgent = asap;
      changed = true;
    }
  }
  const due = dueRawFromCard(src);
  if (due.found) {
    const raw = due.value;
    const empty = raw == null || raw === false || String(raw).trim() === "";
    const ymd = empty ? null : ymdFromKaitenDueDate(raw);
    if (!empty && ymd == null) {
      /* нераспознанный формат — не затираем срок в CRM */
    } else {
      const next = ymd ?? "";
      const prev = getKanbanStageDue(card as never);
      if (shouldKeepLocalKanbanStageDue(prev, next)) {
        /* пустой due_date Kaiten не снимает срок в CRM */
      } else if (prev !== next) {
        setKanbanStageDue(card as never, next);
        changed = true;
      }
    }
  }
  const hasBlockKeys =
    "blocked" in src ||
    "is_blocked" in src ||
    "block_reason" in src ||
    "blockers" in src;
  if (hasBlockKeys) {
    const oid = String(card.linkedOrderId || "").trim();
    const pending = oid
      ? pendingBlockForOrder(oid, listPendingKanbanBlocks())
      : null;
    if (!pending) {
      const meta = kaitenBlockedMetaFromCard(src);
      const nextReason = meta.blocked ? (meta.reason || "").trim() : "";
      const prevBlocked = Boolean(card.blocked);
      const prevReason = String(card.blockReason || "").trim();
      if (prevBlocked !== meta.blocked || prevReason !== nextReason) {
        card.blocked = meta.blocked;
        card.blockReason = nextReason;
        if (meta.blocked) {
          card.blockedAt = meta.blockedAtIso || card.blockedAt || new Date().toISOString();
        } else {
          card.blockedAt = "";
          card.blockedByUserId = "";
        }
        changed = true;
      }
    }
  }
  return changed;
}

/** Срок этапа с зеркала Kaiten (`null` = сброс, ключа нет = не трогать). */
export function applyKaitenStageDueByOrderId(
  state: KanbanAppState,
  byOrderId: Readonly<Record<string, string | null>>,
): boolean {
  let changed = false;
  forEachKanbanCardInState(state, (card) => {
    const oid = card.linkedOrderId?.trim() || "";
    if (!oid || !Object.prototype.hasOwnProperty.call(byOrderId, oid)) return;
    const next = byOrderId[oid] ?? "";
    if (shouldSkipInboundKanbanStageDue(oid, next)) return;
    const prev = getKanbanStageDue(card);
    if (shouldKeepLocalKanbanStageDue(prev, next)) return;
    if (prev !== next) {
      setKanbanStageDue(card, next);
      changed = true;
    }
  });
  return changed;
}
