"use client";

import type { UserRole } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useKanbanAdminMentionTag } from "@/components/kanban/use-kanban-admin-mention-tag";
import { isKanbanAdminGroupRole } from "@/lib/kanban-admin-mention";
import type { KaitenTrackLane } from "@prisma/client";
import { kaitenBlockStateFromCard } from "@/lib/kaiten-card-block";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";
import {
  dedupeParsedKaitenComments,
  parseKaitenListComment,
} from "@/lib/kaiten-comment-parse";

type SpaceOpt = { lane: KaitenTrackLane; boardId: number; label: string };

const KAITEN_LANES: KaitenTrackLane[] = [
  "ORTHOPEDICS",
  "ORTHODONTICS",
  "TEST",
];
const KAITEN_LANE_LABEL: Record<KaitenTrackLane, string> = {
  ORTHOPEDICS: "Ортопедия",
  ORTHODONTICS: "Ортодонтия",
  TEST: "Тест",
};
const KAITEN_TAB_GRID_CLASS = "grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-stretch lg:gap-4";
const KAITEN_TAB_CHAT_PANEL_CLASS =
  "order-1 flex min-h-[min(50vh,22rem)] flex-col rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 lg:min-h-0 lg:h-full";
const KAITEN_TAB_SIDE_PANEL_CLASS =
  "flex min-h-0 flex-col rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-4 lg:h-full";

type KaitenCardTypeOpt = { id: string; name: string; isActive?: boolean };

type CommentRow = {
  id: number;
  text: string;
  created?: string;
  authorName?: string;
  parentId: number | null;
  images?: ChatImage[];
};

type KanbanRow = {
  id: string;
  text: string;
  createdAt: string;
  resolvedAt: string | null;
  rejectedAt: string | null;
};

type KanbanFeedItem = {
  id: string;
  text: string;
  createdAt: string;
  source: "correction" | "prosthetics";
  state: "pending" | "accepted" | "rejected";
};

type ChatImage = {
  id: string;
  name: string;
  url: string;
  mime: string | null;
};

type MentionUser = {
  id: string;
  displayName: string;
  email: string;
  mentionHandle: string | null;
  role?: UserRole;
};

type MentionDraft = { start: number; end: number; query: string };

type MentionOption = {
  id: string;
  label: string;
  insertText: string;
  searchText: string;
};

function normalizeMentionToken(raw: string): string {
  return raw
    .replace(/^@+/, "")
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}._-]/gu, "")
    .trim();
}

function findMentionDraft(text: string, caretPos: number): MentionDraft | null {
  const caret = Math.max(0, Math.min(caretPos, text.length));
  const before = text.slice(0, caret);
  const atPos = before.lastIndexOf("@");
  if (atPos < 0) return null;
  if (atPos > 0 && /[\p{L}\p{N}_]/u.test(before[atPos - 1])) {
    return null;
  }
  const token = before.slice(atPos + 1);
  if (/\s/.test(token)) return null;
  return { start: atPos, end: caret, query: token.toLowerCase() };
}

type KaitenSnapshot = {
  configured: boolean;
  card: Record<string, unknown>;
  trackLane: KaitenTrackLane | null;
  columns: Array<{ id: number; title?: string; name?: string }>;
  lanes: Array<{ id: number; title?: string }>;
  comments: CommentRow[];
  cardImages?: ChatImage[];
  kaitenCardUrl: string | null;
  spaces: SpaceOpt[];
};

type BoardPresence = {
  kanban: {
    hasCard: boolean;
    boardId: string | null;
    cardId: string | null;
    columnTitle: string | null;
    url: string | null;
  };
  kaiten: {
    hasCard: boolean;
    kaitenCardId: number | null;
    url: string | null;
  };
  ensured: boolean;
};

function BoardPresenceStatusBar({
  orderId,
  kaitenCardId,
  kaitenCardUrl,
  kanbanCardUrlFallback,
}: {
  orderId: string;
  kaitenCardId: number | null;
  kaitenCardUrl: string | null;
  kanbanCardUrlFallback: string | null;
}) {
  const [presence, setPresence] = useState<BoardPresence | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/board-presence`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as BoardPresence & {
        error?: string;
      };
      if (!res.ok) {
        setErr(data.error ?? "Не удалось проверить карточки");
        return;
      }
      setPresence(data);
    } catch {
      setErr("Сеть недоступна");
    }
  }, [orderId]);

  useEffect(() => {
    void refresh();
  }, [refresh, kaitenCardId]);

  const createKanban = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/board-presence`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as BoardPresence & {
        error?: string;
        ok?: boolean;
      };
      if (!res.ok) {
        setErr(data.error ?? "Не удалось создать карточку в канбане");
        return;
      }
      setPresence(data);
    } catch {
      setErr("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  };

  const kanbanMissing = presence != null && presence.kanban.hasCard !== true;
  const kanbanHas = !kanbanMissing;
  const kaitenHas =
    presence?.kaiten.hasCard === true ||
    (kaitenCardId != null && Number.isFinite(kaitenCardId));
  /** Ссылка на канбан CRM известна сразу: id карточки = наряд, это та же система. */
  const kanbanUrl =
    presence?.kanban.url ??
    kanbanCardUrlFallback ??
    kanbanOrderDeepLinkPath(orderId);
  const kaitenUrl = presence?.kaiten.url ?? kaitenCardUrl ?? null;

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="font-semibold text-[var(--text-strong)]">Канбан CRM:</span>
          <span
            className={
              kanbanHas
                ? "font-medium text-emerald-700 dark:text-emerald-300"
                : "font-medium text-amber-800 dark:text-amber-200"
            }
          >
            {kanbanHas ? "есть" : "нет"}
          </span>
          {kanbanHas && kanbanUrl ? (
            <a
              href={kanbanUrl}
              className="font-medium text-[var(--sidebar-blue)] underline hover:no-underline"
            >
              Открыть в канбане →
            </a>
          ) : null}
          {!kanbanHas && presence != null ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void createKanban()}
              className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--text-strong)] hover:bg-[var(--table-row-hover)] disabled:opacity-50"
            >
              {busy ? "…" : "Создать в канбане"}
            </button>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="font-semibold text-[var(--text-strong)]">Kaiten:</span>
          <span
            className={
              kaitenHas
                ? "font-medium text-emerald-700 dark:text-emerald-300"
                : "font-medium text-[var(--text-muted)]"
            }
          >
            {presence == null && !err ? "…" : kaitenHas ? "есть" : "нет"}
          </span>
          {kaitenHas && kaitenUrl ? (
            <a
              href={kaitenUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-[var(--text-secondary)] underline hover:no-underline"
            >
              Открыть в Kaiten →
            </a>
          ) : null}
        </div>
      </div>
      {presence?.kanban.columnTitle ? (
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Колонка канбана: {presence.kanban.columnTitle}
        </p>
      ) : null}
      {err ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}

export function OrderKaitenTab({
  orderId,
  kaitenCardId,
  initialKaitenCardTitleLabel = null,
  kaitenCardUrl,
  kanbanCardUrl = null,
  initialTrackLane,
  initialKaitenBlocked,
  initialKaitenBlockReason,
  kaitenSyncError = null,
  kaitenCardTypeId = null,
}: {
  orderId: string;
  kaitenCardId: number | null;
  initialKaitenCardTitleLabel?: string | null;
  kaitenCardUrl: string | null;
  kanbanCardUrl?: string | null;
  initialTrackLane: KaitenTrackLane | null;
  initialKaitenBlocked?: boolean;
  initialKaitenBlockReason?: string | null;
  kaitenDecideLater?: boolean;
  kaitenSyncError?: string | null;
  kaitenCardTypeId?: string | null;
}) {
  const router = useRouter();
  const [snap, setSnap] = useState<KaitenSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const titleDirtyRef = useRef(false);
  const [workLabel, setWorkLabel] = useState(initialKaitenCardTitleLabel ?? "");
  const persistedWorkLabelRef = useRef(initialKaitenCardTitleLabel ?? "");
  const [trackLane, setTrackLane] = useState<KaitenTrackLane | null>(
    initialTrackLane,
  );
  const [columnId, setColumnId] = useState<number | "">("");
  const [laneId, setLaneId] = useState<number | "">("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [newText, setNewText] = useState("");
  const [replyToId, setReplyToId] = useState<number | null>(null);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);
  const adminMentionTag = useKanbanAdminMentionTag();
  const [mentionIndex, setMentionIndex] = useState(0);
  const [commentCaretPos, setCommentCaretPos] = useState(0);
  const [openImage, setOpenImage] = useState<{ name: string; url: string } | null>(
    null,
  );
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);

  /** Только если пользователь сменил пространство — иначе PATCH не трогает доску. */
  const [spaceDirty, setSpaceDirty] = useState(false);

  const [blockReasonDraft, setBlockReasonDraft] = useState("");
  const [blockBusy, setBlockBusy] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const [noCardBlocked, setNoCardBlocked] = useState(initialKaitenBlocked === true);
  const [noCardBlockReason, setNoCardBlockReason] = useState<string | null>(
    initialKaitenBlockReason?.trim() ? initialKaitenBlockReason.trim() : null,
  );

  useEffect(() => {
    const next = initialKaitenCardTitleLabel ?? "";
    setWorkLabel(next);
    persistedWorkLabelRef.current = next;
  }, [initialKaitenCardTitleLabel]);

  const [boardOverride, setBoardOverride] = useState<{
    columns: Array<{ id: number; title?: string; name?: string }>;
    lanes: Array<{ id: number; title?: string }>;
  } | null>(null);

  const [createBusy, setCreateBusy] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkIdDraft, setLinkIdDraft] = useState("");
  const [createTitleDraft, setCreateTitleDraft] = useState("");
  const [manualKaitenError, setManualKaitenError] = useState<string | null>(null);
  const [kanbanFeed, setKanbanFeed] = useState<KanbanFeedItem[]>([]);
  const [kanbanFeedLoading, setKanbanFeedLoading] = useState(false);
  const [kanbanFeedError, setKanbanFeedError] = useState<string | null>(null);
  const [kanbanPostText, setKanbanPostText] = useState("");
  const [kanbanPosting, setKanbanPosting] = useState(false);
  const [kanbanPostError, setKanbanPostError] = useState<string | null>(null);

  const [kaitenTypeOptions, setKaitenTypeOptions] = useState<KaitenCardTypeOpt[]>(
    [],
  );
  const [createKaitenCardTypeId, setCreateKaitenCardTypeId] = useState(
    () => kaitenCardTypeId ?? "",
  );
  const [cardTypeDirty, setCardTypeDirty] = useState(false);
  const [noCardBoardError, setNoCardBoardError] = useState<string | null>(null);

  useEffect(() => {
    setCreateKaitenCardTypeId(kaitenCardTypeId ?? "");
    setCardTypeDirty(false);
  }, [kaitenCardTypeId, orderId]);

  useEffect(() => {
    setNoCardBlocked(initialKaitenBlocked === true);
    setNoCardBlockReason(
      initialKaitenBlockReason?.trim() ? initialKaitenBlockReason.trim() : null,
    );
  }, [initialKaitenBlocked, initialKaitenBlockReason, orderId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/kanban/crm-users", {
          credentials: "include",
          cache: "no-store",
        });
        const data = (await res.json().catch(() => ({}))) as {
          users?: MentionUser[];
        };
        if (!res.ok || cancelled) return;
        setMentionUsers(Array.isArray(data.users) ? data.users : []);
      } catch {
        if (!cancelled) setMentionUsers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async (opts?: { refresh?: boolean }) => {
    if (kaitenCardId == null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const q = opts?.refresh ? "?refresh=1" : "";
      const res = await fetch(`/api/orders/${orderId}/kaiten${q}`);
      const data = (await res.json()) as { error?: string } & Partial<KaitenSnapshot>;
      if (!res.ok) {
        setLoadError(data.error ?? "Не удалось загрузить данные Kaiten");
        setSnap(null);
        return;
      }
      setSnap(data as KaitenSnapshot);
      setSpaceDirty(false);
      setBoardOverride(null);
      const c = data.card;
      if (c && typeof c === "object") {
        const t = c.title;
        setTitle(typeof t === "string" ? t : "");
        titleDirtyRef.current = false;
        const col = c.column_id;
        setColumnId(typeof col === "number" ? col : "");
        const ln = c.lane_id;
        setLaneId(typeof ln === "number" ? ln : "");
      }
      if (data.trackLane != null) {
        setTrackLane(data.trackLane);
      }
    } catch {
      setLoadError("Сеть недоступна");
      setSnap(null);
    } finally {
      setLoading(false);
    }
  }, [orderId, kaitenCardId]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Колонки/дорожки для текущей карточки уже приходят в GET /api/orders/.../kaiten.
   * Запрос /api/kaiten/board к Kaiten нужен только после смены «Пространства» пользователем
   * (иначе дублируем 2 запроса к API и легко упираемся в rate limit).
   */
  useEffect(() => {
    if (trackLane == null) {
      setBoardOverride(null);
      return;
    }
    if (!spaceDirty) {
      setBoardOverride(null);
      return;
    }
    const applyDefaults = true;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/kaiten/board?lane=${encodeURIComponent(trackLane)}`,
        );
        const data = (await res.json()) as {
          columns?: Array<{ id: number; title?: string; name?: string }>;
          lanes?: Array<{ id: number; title?: string }>;
          defaultColumnId?: number;
          defaultLaneId?: number | null;
        };
        if (!res.ok || cancelled) return;
        setBoardOverride({
          columns: data.columns ?? [],
          lanes: data.lanes ?? [],
        });
        if (applyDefaults && !cancelled) {
          if (typeof data.defaultColumnId === "number") {
            setColumnId(data.defaultColumnId);
          }
          if (data.defaultLaneId != null) {
            setLaneId(data.defaultLaneId);
          } else {
            const first = data.lanes?.[0]?.id;
            if (typeof first === "number") setLaneId(first);
          }
        }
      } catch {
        if (!cancelled) setBoardOverride(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trackLane, spaceDirty]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/kaiten-card-types");
        const data = (await res.json()) as
          | KaitenCardTypeOpt[]
          | { error?: string };
        if (!res.ok || cancelled) return;
        if (Array.isArray(data)) {
          setKaitenTypeOptions(
            data.filter((x) => x && x.isActive !== false),
          );
        }
      } catch {
        if (!cancelled) setKaitenTypeOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    if (kaitenCardId != null) {
      return;
    }
    if (trackLane == null) {
      setBoardOverride(null);
      setNoCardBoardError(null);
      return;
    }
    let cancelled = false;
    setNoCardBoardError(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/kaiten/board?lane=${encodeURIComponent(trackLane)}`,
        );
        const data = (await res.json()) as {
          error?: string;
          columns?: Array<{ id: number; title?: string; name?: string }>;
          lanes?: Array<{ id: number; title?: string }>;
          defaultColumnId?: number;
        };
        if (cancelled) return;
        if (!res.ok) {
          setBoardOverride(null);
          setNoCardBoardError(
            data.error ?? "Не удалось загрузить колонки с доски Kaiten",
          );
          return;
        }
        setBoardOverride({
          columns: data.columns ?? [],
          lanes: data.lanes ?? [],
        });
        if (typeof data.defaultColumnId === "number" && !cancelled) {
          setColumnId(data.defaultColumnId);
        }
      } catch {
        if (!cancelled) {
          setBoardOverride(null);
          setNoCardBoardError("Сеть недоступна (колонки Kaiten)");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kaitenCardId, trackLane, orderId]);

  const blockLive = useMemo(() => {
    const c = snap?.card;
    if (c && typeof c === "object") {
      return kaitenBlockStateFromCard(c as Record<string, unknown>);
    }
    return {
      blocked: initialKaitenBlocked === true,
      reason: initialKaitenBlockReason?.trim()
        ? initialKaitenBlockReason.trim()
        : null,
    };
  }, [snap?.card, initialKaitenBlocked, initialKaitenBlockReason]);

  const saveCard = async () => {
    if (kaitenCardId == null) return;
    setSaving(true);
    setSaveError(null);
    try {
      const workLabelDirty =
        workLabel.trim() !== persistedWorkLabelRef.current.trim();
      if (workLabelDirty) {
        const orderRes = await fetch(`/api/orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kaitenCardTitleLabel: workLabel.trim() || null,
          }),
        });
        const orderData = (await orderRes.json().catch(() => ({}))) as {
          error?: string;
          kaitenTitleSyncError?: string | null;
          kaitenCardTitleMirror?: string | null;
        };
        if (!orderRes.ok) {
          setSaveError(orderData.error ?? "Не удалось сохранить вид работы");
          return;
        }
        if (orderData.kaitenTitleSyncError) {
          setSaveError(
            `Вид работы сохранён, но Kaiten не обновился: ${orderData.kaitenTitleSyncError}`,
          );
          return;
        }
        persistedWorkLabelRef.current = workLabel.trim();
        if (
          !titleDirtyRef.current &&
          typeof orderData.kaitenCardTitleMirror === "string" &&
          orderData.kaitenCardTitleMirror.trim()
        ) {
          setTitle(orderData.kaitenCardTitleMirror);
          titleDirtyRef.current = false;
        }
      }

      const body: Record<string, unknown> = {};
      if (titleDirtyRef.current) {
        body.title = title.trim();
      }
      if (spaceDirty && trackLane != null) {
        body.kaitenTrackLane = trackLane;
      }
      if (columnId !== "") {
        body.columnId = columnId;
      }
      if (laneId !== "") {
        body.laneId = laneId;
      } else if (columnId !== "" && laneOptions[0]?.id != null) {
        /* «—» + колонка: иначе на сервер уходит lane от пространства и Kaiten даёт Position inconsistency. */
        body.laneId = laneOptions[0].id;
      }
      if (cardTypeDirty) {
        const typeId = String(createKaitenCardTypeId).trim();
        if (!typeId) {
          setSaveError("Выберите тип карточки — без этого сохранить нельзя.");
          return;
        }
        body.kaitenCardTypeId = typeId;
      }
      if (Object.keys(body).length === 0) {
        router.refresh();
        return;
      }
      const res = await fetch(`/api/orders/${orderId}/kaiten`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        error?: string;
        card?: Record<string, unknown>;
        trackLane?: KaitenTrackLane | null;
      };
      if (!res.ok) {
        setSaveError(data.error ?? "Ошибка сохранения");
        return;
      }
      if (cardTypeDirty) {
        setCardTypeDirty(false);
      }
      if (data.card && typeof data.card === "object") {
        const c = data.card;
        const t = c.title;
        if (typeof t === "string") {
          setTitle(t);
          titleDirtyRef.current = false;
        }
        const col = c.column_id;
        if (typeof col === "number") setColumnId(col);
        const ln = c.lane_id;
        if (typeof ln === "number") setLaneId(ln);
        setSnap((prev) =>
          prev
            ? {
                ...prev,
                card: c as Record<string, unknown>,
                ...(data.trackLane !== undefined
                  ? { trackLane: data.trackLane }
                  : {}),
              }
            : prev,
        );
      }
      if (data.trackLane !== undefined) {
        setTrackLane(data.trackLane);
      }
      setSpaceDirty(false);
      titleDirtyRef.current = false;
      router.refresh();
    } catch {
      setSaveError("Сеть недоступна");
    } finally {
      setSaving(false);
    }
  };

  const columnOptions = boardOverride?.columns ?? snap?.columns ?? [];
  const laneOptions = boardOverride?.lanes ?? snap?.lanes ?? [];
  const adminMentionUserIds = useMemo(
    () =>
      mentionUsers
        .filter((u) => u.role != null && isKanbanAdminGroupRole(u.role))
        .map((u) => u.id),
    [mentionUsers],
  );
  const mentionOptions = useMemo<MentionOption[]>(() => {
    const synthetic: MentionOption[] =
      adminMentionUserIds.length > 0 && adminMentionTag
        ? [
            {
              id: "__kanban_lab_team__",
              label: `Лаборатория (@${adminMentionTag})`,
              insertText: `@${adminMentionTag}`,
              searchText:
                `лаборатория ${adminMentionTag} администратор`.toLowerCase(),
            },
          ]
        : [];
    const rest = mentionUsers
      .filter((u) => !isKanbanAdminGroupRole(u.role))
      .map((u) => {
        const fallbackByEmail = normalizeMentionToken(
          (u.email || "").split("@")[0] || "",
        );
        const fallbackByName = normalizeMentionToken(u.displayName || "");
        const mentionToken =
          normalizeMentionToken(u.mentionHandle || "") ||
          fallbackByEmail ||
          fallbackByName;
        if (!mentionToken) return null;
        return {
          id: u.id,
          label: u.displayName,
          insertText: `@${mentionToken}`,
          searchText: `${u.displayName} ${u.email} ${mentionToken}`.toLowerCase(),
        };
      })
      .filter((x): x is MentionOption => x != null);
    return [...synthetic, ...rest];
  }, [mentionUsers, adminMentionTag, adminMentionUserIds]);
  const mentionDraft = useMemo(
    () => findMentionDraft(newText, commentCaretPos),
    [newText, commentCaretPos],
  );
  const mentionFiltered = useMemo(() => {
    if (!mentionDraft) return [];
    const q = mentionDraft.query.trim();
    const base = q
      ? mentionOptions.filter((x) => x.searchText.includes(q))
      : mentionOptions;
    return base.slice(0, 8);
  }, [mentionDraft, mentionOptions]);
  const applyMention = useCallback(
    (option: MentionOption) => {
      if (!mentionDraft) return;
      const before = newText.slice(0, mentionDraft.start);
      const after = newText.slice(mentionDraft.end);
      const nextText = `${before}${option.insertText} ${after}`;
      const nextCaret = before.length + option.insertText.length + 1;
      setNewText(nextText);
      setCommentCaretPos(nextCaret);
      setMentionIndex(0);
      requestAnimationFrame(() => {
        if (!commentTextareaRef.current) return;
        commentTextareaRef.current.focus();
        commentTextareaRef.current.setSelectionRange(nextCaret, nextCaret);
      });
    },
    [newText, mentionDraft],
  );

  useEffect(() => {
    setMentionIndex(0);
  }, [mentionDraft?.start, mentionDraft?.query]);

  const sendComment = async () => {
    const t = newText.trim();
    if (!t) return;
    setPosting(true);
    setPostError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/kaiten/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: t,
          parentCommentId: replyToId,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        comment?: Record<string, unknown>;
      };
      if (!res.ok) {
        setPostError(data.error ?? "Не отправлено");
        return;
      }
      setNewText("");
      setCommentCaretPos(0);
      setMentionIndex(0);
      setReplyToId(null);
      const row = data.comment ? parseKaitenListComment(data.comment) : null;
      if (row) {
        setSnap((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            comments: dedupeParsedKaitenComments([...prev.comments, row]),
          };
        });
      } else {
        await load({ refresh: true });
      }
    } catch {
      setPostError("Сеть недоступна");
    } finally {
      setPosting(false);
    }
  };

  const loadKanbanFeed = useCallback(async () => {
    setKanbanFeedLoading(true);
    setKanbanFeedError(null);
    try {
      const [corrRes, protRes] = await Promise.all([
        fetch(`/api/orders/${orderId}/chat-corrections`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch(`/api/orders/${orderId}/prosthetics-requests`, {
          credentials: "include",
          cache: "no-store",
        }),
      ]);
      const corrData = (await corrRes.json().catch(() => ({}))) as {
        corrections?: KanbanRow[];
        error?: string;
      };
      const protData = (await protRes.json().catch(() => ({}))) as {
        requests?: KanbanRow[];
        error?: string;
      };
      if (!corrRes.ok) {
        setKanbanFeedError(corrData.error ?? "Не удалось загрузить корректировки");
        setKanbanFeed([]);
        return;
      }
      if (!protRes.ok) {
        setKanbanFeedError(protData.error ?? "Не удалось загрузить заявки по протетике");
        setKanbanFeed([]);
        return;
      }
      const corrections = Array.isArray(corrData.corrections)
        ? corrData.corrections
        : [];
      const requests = Array.isArray(protData.requests) ? protData.requests : [];
      const items: KanbanFeedItem[] = [
        ...corrections.map((row) => ({
          id: `corr-${row.id}`,
          text: row.text,
          createdAt: row.createdAt,
          source: "correction" as const,
          state: (row.rejectedAt
            ? "rejected"
            : row.resolvedAt
              ? "accepted"
              : "pending") as KanbanFeedItem["state"],
        })),
        ...requests.map((row) => ({
          id: `pros-${row.id}`,
          text: row.text,
          createdAt: row.createdAt,
          source: "prosthetics" as const,
          state: (row.rejectedAt
            ? "rejected"
            : row.resolvedAt
              ? "accepted"
              : "pending") as KanbanFeedItem["state"],
        })),
      ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setKanbanFeed(items);
    } catch {
      setKanbanFeedError("Сеть недоступна");
      setKanbanFeed([]);
    } finally {
      setKanbanFeedLoading(false);
    }
  }, [orderId]);

  const sendKanbanChatMessage = useCallback(async () => {
    const text = kanbanPostText.trim();
    if (!text) return;
    setKanbanPosting(true);
    setKanbanPostError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/chat-corrections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setKanbanPostError(data.error ?? "Не отправлено");
        return;
      }
      setKanbanPostText("");
      await loadKanbanFeed();
      router.refresh();
    } catch {
      setKanbanPostError("Сеть недоступна");
    } finally {
      setKanbanPosting(false);
    }
  }, [kanbanPostText, loadKanbanFeed, orderId, router]);

  useEffect(() => {
    if (kaitenCardId != null) return;
    void loadKanbanFeed();
  }, [kaitenCardId, loadKanbanFeed]);

  if (kaitenCardId == null) {
    const hasKaitenCreateFields =
      String(createKaitenCardTypeId).trim() !== "" &&
      trackLane != null &&
      columnId !== "";
    const canCreateFromCrm = hasKaitenCreateFields;

    const runCreate = async () => {
      setManualKaitenError(null);
      setCreateBusy(true);
      try {
        const res = await fetch(`/api/orders/${orderId}/kaiten`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            title: createTitleDraft.trim() || undefined,
            kaitenTrackLane: trackLane ?? undefined,
            kaitenCardTypeId: String(createKaitenCardTypeId).trim() || null,
            columnId:
              columnId === "" ? undefined : Math.floor(Number(columnId)),
          }),
        });
        const data = (await res.json()) as { error?: string; kaitenCardId?: number };
        if (!res.ok) {
          setManualKaitenError(data.error ?? "Не удалось создать карточку");
          return;
        }
        router.refresh();
      } catch {
        setManualKaitenError("Сеть недоступна");
      } finally {
        setCreateBusy(false);
      }
    };

    const runLink = async () => {
      setManualKaitenError(null);
      const n = Number.parseInt(linkIdDraft.trim(), 10);
      if (!Number.isFinite(n) || n <= 0) {
        setManualKaitenError("Введите положительное число — id из URL карточки Kaiten");
        return;
      }
      setLinkBusy(true);
      try {
        const res = await fetch(`/api/orders/${orderId}/kaiten`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "link", cardId: n }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setManualKaitenError(data.error ?? "Не удалось привязать");
          return;
        }
        setLinkIdDraft("");
        router.refresh();
      } catch {
        setManualKaitenError("Сеть недоступна");
      } finally {
        setLinkBusy(false);
      }
    };

    const setNoCardBlockState = async (blocked: boolean, reason?: string) => {
      setBlockError(null);
      setBlockBusy(true);
      try {
        const label = blocked ? "Заблокировать карточку" : "Разблокировать карточку";
        const res = await fetch(`/api/orders/${orderId}/list-tags`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label,
            ...(blocked ? { blockReason: reason ?? "" } : {}),
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          kaitenBlock?: { kind?: string; message?: string };
          kaitenUnblock?: { kind?: string; message?: string };
        };
        if (!res.ok) {
          setBlockError(data.error ?? "Не удалось сохранить блокировку");
          return;
        }
        const result = blocked ? data.kaitenBlock : data.kaitenUnblock;
        if (result?.kind === "error") {
          setBlockError(result.message ?? "Не удалось сохранить блокировку");
          return;
        }
        setNoCardBlocked(blocked);
        if (blocked) {
          const cleaned = String(reason ?? "").trim();
          setNoCardBlockReason(cleaned || null);
          setBlockReasonDraft("");
        } else {
          setNoCardBlockReason(null);
        }
        router.refresh();
      } catch {
        setBlockError("Сеть недоступна");
      } finally {
        setBlockBusy(false);
      }
    };

    return (
      <div className="space-y-6">
        <BoardPresenceStatusBar
          orderId={orderId}
          kaitenCardId={kaitenCardId}
          kaitenCardUrl={kaitenCardUrl}
          kanbanCardUrlFallback={kanbanCardUrl}
        />
        <p className="text-xs text-[var(--text-muted)]">
          Карточка в Kaiten пока не привязана. Сначала работает канбан CRM (шапка,
          колонка, чат корректировок). Создание и привязка Kaiten — ниже, вторично.
        </p>
        {kaitenSyncError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-950 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100">
            <p className="font-medium">Записанная ошибка синхронизации</p>
            <p className="mt-1 whitespace-pre-wrap break-words font-mono text-xs">
              {kaitenSyncError}
            </p>
          </div>
        ) : null}

        <div className={KAITEN_TAB_GRID_CLASS}>
          <div className={`order-2 ${KAITEN_TAB_SIDE_PANEL_CLASS}`}>
            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Блокировка
            </h3>
            {blockError ? (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">{blockError}</p>
            ) : null}
            {noCardBlocked ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium text-[var(--text-strong)]">
                  Карточка сейчас заблокирована
                </p>
                {noCardBlockReason ? (
                  <p className="whitespace-pre-wrap rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-2 text-xs leading-relaxed text-[var(--app-text)]">
                    {noCardBlockReason}
                  </p>
                ) : (
                  <p className="text-xs text-[var(--text-muted)]">Причина не указана.</p>
                )}
                <button
                  type="button"
                  disabled={blockBusy}
                  onClick={() => void setNoCardBlockState(false)}
                  className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--text-strong)] shadow-sm hover:bg-[var(--table-row-hover)] disabled:opacity-50"
                >
                  {blockBusy ? "Запрос…" : "Разблокировать"}
                </button>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <textarea
                  placeholder="Причина блокировки"
                  className="min-h-[5.5rem] w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-2 text-sm text-[var(--app-text)] placeholder:text-[var(--text-muted)]"
                  rows={3}
                  value={blockReasonDraft}
                  onChange={(e) => setBlockReasonDraft(e.target.value)}
                />
                <button
                  type="button"
                  disabled={blockBusy || !blockReasonDraft.trim()}
                  onClick={() =>
                    void setNoCardBlockState(true, blockReasonDraft)
                  }
                  className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-600 disabled:opacity-50"
                >
                  {blockBusy ? "Запрос…" : "Заблокировать"}
                </button>
              </div>
            )}
          </div>

          <div className={`order-3 ${KAITEN_TAB_SIDE_PANEL_CLASS}`}>
            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Шапка и положение на доске
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-body)] sm:col-span-2">
                Заголовок карточки
                <input
                  className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-2 text-sm text-[var(--app-text)]"
                  value={createTitleDraft}
                  placeholder="Заголовок для карточки"
                  onChange={(e) => setCreateTitleDraft(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-body)] sm:col-span-2">
                Тип карточки
                <select
                  className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-2 text-sm"
                  value={String(createKaitenCardTypeId)}
                  onChange={(e) => {
                    setCreateKaitenCardTypeId(e.target.value);
                    setCardTypeDirty(true);
                  }}
                >
                  <option value="">— выберите тип —</option>
                  {kaitenTypeOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-body)]">
                Пространство (доска)
                <select
                  className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-2 text-sm"
                  value={trackLane ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTrackLane(v === "" ? null : (v as KaitenTrackLane));
                    setColumnId("");
                  }}
                >
                  <option value="">— выберите пространство —</option>
                  {KAITEN_LANES.map((lane) => (
                    <option key={lane} value={lane}>
                      {KAITEN_LANE_LABEL[lane]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-body)]">
                Колонка (этап на доске)
                <select
                  className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-2 text-sm"
                  value={columnId === "" ? "" : String(columnId)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setColumnId(v === "" ? "" : Number(v));
                  }}
                  disabled={trackLane == null || columnOptions.length === 0}
                >
                  <option value="">
                    {trackLane == null ? "Сначала пространство" : "— выберите колонку —"}
                  </option>
                  {columnOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title || c.name || `Колонка ${c.id}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {noCardBoardError ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300/90">
                {noCardBoardError}
              </p>
            ) : null}
          </div>

          <div className={KAITEN_TAB_CHAT_PANEL_CLASS}>
            <h3 className="shrink-0 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Чат карточки
            </h3>
            <ul className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto lg:max-h-none max-h-[min(50vh,28rem)]">
              <li className="text-sm text-[var(--text-muted)]">Канбан-чат по наряду.</li>
              <li className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                Сообщения отправляются как «Корректировки» в карточку наряда.
              </li>
              {kanbanFeedLoading ? (
                <li className="text-xs text-[var(--text-muted)]">Загрузка…</li>
              ) : null}
              {!kanbanFeedLoading && kanbanFeed.length === 0 ? (
                <li className="text-xs text-[var(--text-muted)]">Пока нет сообщений.</li>
              ) : null}
              {kanbanFeed.map((item) => (
                <li
                  key={item.id}
                  className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--text-muted)]">
                    <span className="font-semibold">
                      {item.source === "correction" ? "Корректировка" : "Протетика"}
                    </span>
                    <span>{new Date(item.createdAt).toLocaleString("ru-RU")}</span>
                    <span>
                      {item.state === "accepted"
                        ? "Принято"
                        : item.state === "rejected"
                          ? "Отклонено"
                          : "В работе"}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--app-text)]">
                    {item.text}
                  </p>
                </li>
              ))}
            </ul>
            {kanbanFeedError ? (
              <p className="mt-1 text-sm text-red-600">{kanbanFeedError}</p>
            ) : null}
            <div className="relative mt-2">
              <textarea
                className="min-h-[88px] w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-2 text-sm text-[var(--app-text)]"
                placeholder="Новое сообщение…"
                value={kanbanPostText}
                onChange={(e) => setKanbanPostText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendKanbanChatMessage();
                  }
                }}
              />
            </div>
            {kanbanPostError ? (
              <p className="mt-1 text-sm text-red-600">{kanbanPostError}</p>
            ) : null}
            <button
              type="button"
              disabled={kanbanPosting || !kanbanPostText.trim()}
              onClick={() => void sendKanbanChatMessage()}
              className="mt-2 rounded-md border border-[var(--input-border)] bg-[var(--surface-subtle)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)] disabled:opacity-50"
            >
              {kanbanPosting ? "Отправка…" : "Отправить"}
            </button>
          </div>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Создание внешней карточки
          </h3>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            Использует параметры из правого блока: заголовок, тип, пространство и колонку.
          </p>
          <button
            type="button"
            disabled={!canCreateFromCrm || createBusy}
            onClick={() => void runCreate()}
            className={
              canCreateFromCrm
                ? "mt-3 rounded-md border border-emerald-700 bg-emerald-700 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                : "mt-3 rounded-md border border-[var(--border-default)] bg-[var(--panel)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] shadow-sm hover:bg-[var(--panel-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            }
          >
            {createBusy ? "Создаём…" : "Создать карточку в Kaiten / канбан"}
          </button>
          {!hasKaitenCreateFields ? (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Укажите тип карточки, пространство и колонку выше — тогда кнопка станет
              зелёной.
            </p>
          ) : null}
          <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
            <p className="mb-2 text-xs text-[var(--text-secondary)]">
              Карточка уже есть в Kaiten — укажите числовой id (например{" "}
              <code className="rounded bg-[var(--code-bg)] px-1">…/card/12345</code>).
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="id карточки"
                value={linkIdDraft}
                onChange={(e) => setLinkIdDraft(e.target.value)}
                className="w-full min-w-0 rounded-md border border-[var(--border-default)] bg-[var(--input-bg)] px-2.5 py-1.5 text-sm sm:max-w-[12rem]"
              />
              <button
                type="button"
                disabled={linkBusy}
                onClick={() => void runLink()}
                className="rounded-md border border-[var(--border-default)] bg-[var(--panel)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] shadow-sm hover:bg-[var(--panel-hover)] disabled:opacity-50"
              >
                {linkBusy ? "Привязка…" : "Привязать"}
              </button>
            </div>
          </div>
          {manualKaitenError ? (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{manualKaitenError}</p>
          ) : null}
        </div>
      </div>
    );
  }

  const comments = snap?.comments ?? [];
  const cardImages = snap?.cardImages ?? [];
  const roots = comments.filter((c) => c.parentId == null);
  const childrenOf = (pid: number) =>
    comments.filter((c) => c.parentId === pid);
  const renderChatImages = (images: ChatImage[] | undefined) => {
    if (!images?.length) return null;
    return (
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((image) => (
          <button
            key={image.id}
            type="button"
            className="min-w-0 text-left"
            title={image.name}
            onClick={() => setOpenImage({ name: image.name, url: image.url })}
          >
            <img
              src={image.url}
              alt={image.name}
              className="h-20 w-full rounded border border-[var(--card-border)] object-cover hover:opacity-90"
            />
            <span className="mt-1 block truncate text-[10px] text-[var(--text-muted)]">
              {image.name}
            </span>
          </button>
        ))}
      </div>
    );
  };

  const setBlockedInKaiten = async (blocked: boolean, reason?: string) => {
    setBlockBusy(true);
    setBlockError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/kaiten`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          blocked
            ? { blocked: true, blockReason: reason ?? "" }
            : { blocked: false },
        ),
      });
      const data = (await res.json()) as {
        error?: string;
        card?: Record<string, unknown>;
        trackLane?: KaitenTrackLane | null;
      };
      if (!res.ok) {
        setBlockError(data.error ?? "Ошибка Kaiten");
        return;
      }
      setBlockReasonDraft("");
      if (data.card && typeof data.card === "object") {
        const c = data.card;
        const t = c.title;
        if (typeof t === "string") {
          setTitle(t);
          titleDirtyRef.current = false;
        }
        const col = c.column_id;
        if (typeof col === "number") setColumnId(col);
        const ln = c.lane_id;
        if (typeof ln === "number") setLaneId(ln);
        setSnap((prev) =>
          prev
            ? {
                ...prev,
                card: c as Record<string, unknown>,
                ...(data.trackLane !== undefined
                  ? { trackLane: data.trackLane }
                  : {}),
              }
            : prev,
        );
      }
      if (data.trackLane !== undefined) {
        setTrackLane(data.trackLane);
      }
      router.refresh();
    } catch {
      setBlockError("Сеть недоступна");
    } finally {
      setBlockBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <BoardPresenceStatusBar
        orderId={orderId}
        kaitenCardId={kaitenCardId}
        kaitenCardUrl={kaitenCardUrl}
        kanbanCardUrlFallback={kanbanCardUrl}
      />
      {loading ? (
        <p className="text-xs text-[var(--text-muted)]">
          Карточка канбана уже на экране, данные доски подгружаются…
        </p>
      ) : loadError ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
          <p>{loadError}</p>
          <button
            type="button"
            className="mt-2 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-950 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-50 dark:hover:bg-amber-900/40"
            onClick={() => void load({ refresh: true })}
          >
            Повторить
          </button>
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">
          Приоритет — карточка в канбане CRM. Сохранение и чат уходят на доску.{" "}
          <button
            type="button"
            className="font-medium text-[var(--sidebar-blue)] hover:underline"
            onClick={() => void load({ refresh: true })}
          >
            Обновить с доски
          </button>
        </p>
      )}

      <div className={KAITEN_TAB_GRID_CLASS}>
      <div className={`order-2 ${KAITEN_TAB_SIDE_PANEL_CLASS}`}>
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Блокировка
        </h3>
        {blockError ? (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{blockError}</p>
        ) : null}
        {blockLive.blocked ? (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-medium text-[var(--text-strong)]">
              Карточка сейчас заблокирована
            </p>
            {blockLive.reason ? (
              <p className="whitespace-pre-wrap rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-2 text-xs leading-relaxed text-[var(--app-text)]">
                {blockLive.reason}
              </p>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">
                Причина не указана.
              </p>
            )}
            <button
              type="button"
              disabled={blockBusy}
              onClick={() => void setBlockedInKaiten(false)}
              className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--text-strong)] shadow-sm hover:bg-[var(--table-row-hover)] disabled:opacity-50"
            >
              {blockBusy ? "Запрос…" : "Разблокировать"}
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <textarea
              id="kaiten-block-reason"
              aria-label="Причина блокировки"
              placeholder="Причина блокировки"
              className="min-h-[5.5rem] w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-2 text-sm text-[var(--app-text)] placeholder:text-[var(--text-muted)]"
              rows={3}
              value={blockReasonDraft}
              onChange={(e) => setBlockReasonDraft(e.target.value)}
              maxLength={2000}
            />
            <button
              type="button"
              disabled={blockBusy || !blockReasonDraft.trim()}
              onClick={() => void setBlockedInKaiten(true, blockReasonDraft)}
              className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-600 disabled:opacity-50"
            >
              {blockBusy ? "Запрос…" : "Заблокировать"}
            </button>
          </div>
        )}
      </div>

      <div className={`order-3 ${KAITEN_TAB_SIDE_PANEL_CLASS}`}>
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Шапка и положение на доске
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-body)] sm:col-span-2">
            Вид работы
            <span className="text-[10px] font-normal text-[var(--text-muted)]">
              Между врачом и сроком в шапке. Пусто — подставится тип карточки.
            </span>
            <input
              className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-2 text-sm text-[var(--app-text)]"
              value={workLabel}
              onChange={(e) => setWorkLabel(e.target.value)}
              placeholder="Например: коронки 14–16"
              maxLength={120}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-body)] sm:col-span-2">
            Тип карточки
            <select
              className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-2 text-sm text-[var(--app-text)]"
              value={String(createKaitenCardTypeId)}
              onChange={(e) => {
                setCreateKaitenCardTypeId(e.target.value);
                setCardTypeDirty(true);
              }}
            >
              <option value="">— выберите тип —</option>
              {kaitenTypeOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-body)] sm:col-span-2">
            Заголовок карточки
            <span className="text-[10px] font-normal text-[var(--text-muted)]">
              Полный текст шапки. При смене вида работы пересчитывается автоматически.
            </span>
            <input
              className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-2 text-sm text-[var(--app-text)]"
              value={title}
              onChange={(e) => {
                titleDirtyRef.current = true;
                setTitle(e.target.value);
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-body)]">
            Пространство (доска)
            <select
              className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-2 text-sm text-[var(--app-text)]"
              value={trackLane ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setTrackLane(v === "" ? null : (v as KaitenTrackLane));
                setSpaceDirty(true);
              }}
            >
              <option value="">—</option>
              {(snap?.spaces?.length
                ? snap.spaces
                : KAITEN_LANES.map((lane) => ({
                    lane,
                    label: KAITEN_LANE_LABEL[lane],
                  }))
              ).map((s) => (
                <option key={s.lane} value={s.lane}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-body)]">
            Колонка (статус / этап)
            <select
              className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-2 text-sm text-[var(--app-text)]"
              value={columnId === "" ? "" : String(columnId)}
              onChange={(e) => {
                const v = e.target.value;
                setColumnId(v === "" ? "" : Number(v));
              }}
            >
              <option value="">—</option>
              {columnOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title || c.name || `Колонка ${c.id}`}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-body)] sm:col-span-2">
            Дорожка (lane)
            <select
              className="max-w-md rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-2 text-sm text-[var(--app-text)]"
              value={laneId === "" ? "" : String(laneId)}
              onChange={(e) => {
                const v = e.target.value;
                setLaneId(v === "" ? "" : Number(v));
              }}
            >
              <option value="">—</option>
              {laneOptions.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title || `Дорожка ${l.id}`}
                </option>
              ))}
            </select>
          </label>
        </div>
        {saveError ? (
          <p className="mt-2 text-sm text-red-600">{saveError}</p>
        ) : null}
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveCard()}
          className="mt-3 rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
        >
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
      </div>

      <div className={KAITEN_TAB_CHAT_PANEL_CLASS}>
        <h3 className="shrink-0 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Чат карточки
        </h3>
        <ul className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto lg:max-h-none max-h-[min(50vh,28rem)]">
          {roots.length === 0 ? (
            <li className="text-sm text-[var(--text-muted)]">
              {loading ? "Подгружаем чат…" : "Сообщений пока нет."}
            </li>
          ) : (
            roots.map((c) => (
              <li
                key={c.id}
                className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-[10px] text-[var(--text-muted)]">
                  <span className="font-medium text-[var(--text-strong)]">
                    {c.authorName ?? "Участник"}
                  </span>
                  {c.created ? (
                    <time dateTime={c.created}>
                      {new Date(c.created).toLocaleString("ru-RU")}
                    </time>
                  ) : null}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--app-text)]">
                  {c.text}
                </p>
                {renderChatImages(c.images)}
                <button
                  type="button"
                  className="mt-1 text-xs font-medium text-[var(--sidebar-blue)] hover:underline"
                  onClick={() => {
                    setReplyToId(c.id);
                  }}
                >
                  Ответить
                </button>
                {childrenOf(c.id).length > 0 ? (
                  <ul className="mt-2 space-y-2 border-l-2 border-[var(--card-border)] pl-3">
                    {childrenOf(c.id).map((ch) => (
                      <li key={ch.id} className="text-sm">
                        <div className="text-[10px] text-[var(--text-muted)]">
                          {ch.authorName ?? "Участник"}{" "}
                          {ch.created
                            ? `· ${new Date(ch.created).toLocaleString("ru-RU")}`
                            : null}
                        </div>
                        <p className="whitespace-pre-wrap text-[var(--app-text)]">
                          {ch.text}
                        </p>
                        {renderChatImages(ch.images)}
                        <button
                          type="button"
                          className="mt-0.5 text-xs text-[var(--sidebar-blue)] hover:underline"
                          onClick={() => setReplyToId(ch.id)}
                        >
                          Ответить
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))
          )}
        </ul>

        {cardImages.length > 0 ? (
          <div className="mt-3 shrink-0 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
              Изображения в карточке
            </p>
            {renderChatImages(cardImages)}
          </div>
        ) : null}

        {replyToId != null ? (
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            Ответ на сообщение #{replyToId}.{" "}
            <button
              type="button"
              className="font-medium text-[var(--sidebar-blue)] hover:underline"
              onClick={() => setReplyToId(null)}
            >
              Отменить
            </button>
          </p>
        ) : null}

        <div className="relative mt-2">
          {mentionFiltered.length > 0 ? (
            <div className="absolute bottom-[calc(100%+4px)] left-0 right-0 z-10 max-h-56 overflow-y-auto rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] p-1 shadow-xl">
              {mentionFiltered.map((option, idx) => (
                <button
                  key={`${option.id}-${option.insertText}`}
                  type="button"
                  className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[0.78rem] ${
                    idx === mentionIndex
                      ? "bg-[var(--surface-subtle)] text-[var(--sidebar-blue)]"
                      : "text-[var(--app-text)] hover:bg-[var(--surface-subtle)]"
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyMention(option);
                  }}
                >
                  <span className="truncate">{option.label}</span>
                  <span className="ml-3 shrink-0 text-[0.72rem] text-[var(--text-muted)]">
                    {option.insertText}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          <textarea
            ref={commentTextareaRef}
            className="min-h-[88px] w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-2 text-sm text-[var(--app-text)]"
            placeholder="Новое сообщение…"
            value={newText}
            onChange={(e) => {
              setNewText(e.target.value);
              setCommentCaretPos(e.target.selectionStart ?? e.target.value.length);
            }}
            onClick={(e) => {
              setCommentCaretPos(e.currentTarget.selectionStart ?? newText.length);
            }}
            onSelect={(e) => {
              setCommentCaretPos(e.currentTarget.selectionStart ?? newText.length);
            }}
            onKeyDown={(e) => {
              if (mentionFiltered.length > 0) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setMentionIndex((v) => (v + 1) % mentionFiltered.length);
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setMentionIndex((v) =>
                    v <= 0 ? mentionFiltered.length - 1 : v - 1,
                  );
                  return;
                }
                if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
                  e.preventDefault();
                  applyMention(
                    mentionFiltered[
                      Math.min(mentionIndex, mentionFiltered.length - 1)
                    ],
                  );
                  return;
                }
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendComment();
              }
            }}
          />
        </div>
        {postError ? (
          <p className="mt-1 text-sm text-red-600">{postError}</p>
        ) : null}
        <button
          type="button"
          disabled={posting || !newText.trim()}
          onClick={() => void sendComment()}
          className="mt-2 rounded-md border border-[var(--input-border)] bg-[var(--surface-subtle)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)] disabled:opacity-50"
        >
          {posting ? "Отправка…" : "Отправить в Kaiten"}
        </button>
      </div>
      </div>
      {openImage ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpenImage(null);
          }}
        >
          <div className="max-h-full max-w-5xl">
            <div className="mb-2 flex items-center justify-between gap-3 text-white">
              <p className="min-w-0 truncate text-sm font-medium">{openImage.name}</p>
              <button
                type="button"
                className="rounded-md bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
                onClick={() => setOpenImage(null)}
              >
                Закрыть
              </button>
            </div>
            <img
              src={openImage.url}
              alt={openImage.name}
              className="max-h-[82vh] max-w-full rounded-lg object-contain"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
