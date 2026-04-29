"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { KaitenTrackLane } from "@prisma/client";
import { kaitenBlockStateFromCard } from "@/lib/kaiten-card-block";
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

type KaitenCardTypeOpt = { id: string; name: string; isActive?: boolean };

type CommentRow = {
  id: number;
  text: string;
  created?: string;
  authorName?: string;
  parentId: number | null;
};

type KaitenSnapshot = {
  configured: boolean;
  card: Record<string, unknown>;
  trackLane: KaitenTrackLane | null;
  columns: Array<{ id: number; title?: string; name?: string }>;
  lanes: Array<{ id: number; title?: string }>;
  comments: CommentRow[];
  kaitenCardUrl: string | null;
  spaces: SpaceOpt[];
};

export function OrderKaitenTab({
  orderId,
  kaitenCardId,
  kaitenCardUrl,
  initialTrackLane,
  initialKaitenBlocked,
  initialKaitenBlockReason,
  kaitenDecideLater = false,
  kaitenSyncError = null,
  kaitenCardTypeId = null,
  workSent = false,
}: {
  orderId: string;
  kaitenCardId: number | null;
  kaitenCardUrl: string | null;
  initialTrackLane: KaitenTrackLane | null;
  initialKaitenBlocked?: boolean;
  initialKaitenBlockReason?: string | null;
  kaitenDecideLater?: boolean;
  kaitenSyncError?: string | null;
  kaitenCardTypeId?: string | null;
  /** «Работа отправлена» (admin) — до этого создание в Kaiten визуально/логикой недоступно. */
  workSent?: boolean;
}) {
  const router = useRouter();
  const [snap, setSnap] = useState<KaitenSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
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

  /** Только если пользователь сменил пространство — иначе PATCH не трогает доску. */
  const [spaceDirty, setSpaceDirty] = useState(false);

  const [blockReasonDraft, setBlockReasonDraft] = useState("");
  const [blockBusy, setBlockBusy] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  const [boardOverride, setBoardOverride] = useState<{
    columns: Array<{ id: number; title?: string; name?: string }>;
    lanes: Array<{ id: number; title?: string }>;
  } | null>(null);

  const [createBusy, setCreateBusy] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkIdDraft, setLinkIdDraft] = useState("");
  const [manualKaitenError, setManualKaitenError] = useState<string | null>(null);

  const [kaitenTypeOptions, setKaitenTypeOptions] = useState<KaitenCardTypeOpt[]>(
    [],
  );
  const [createKaitenCardTypeId, setCreateKaitenCardTypeId] = useState(
    () => kaitenCardTypeId ?? "",
  );
  const [noCardBoardError, setNoCardBoardError] = useState<string | null>(null);

  useEffect(() => {
    setCreateKaitenCardTypeId(kaitenCardTypeId ?? "");
  }, [kaitenCardTypeId, orderId]);

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
    if (kaitenCardId != null) return;
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
  }, [kaitenCardId, orderId]);

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
      const body: Record<string, unknown> = {
        title: title.trim(),
      };
      if (spaceDirty && trackLane != null) {
        body.kaitenTrackLane = trackLane;
      }
      if (columnId !== "") {
        body.columnId = columnId;
      }
      if (laneId !== "") {
        body.laneId = laneId;
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
      if (data.card && typeof data.card === "object") {
        const c = data.card;
        const t = c.title;
        if (typeof t === "string") setTitle(t);
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
    } catch {
      setSaveError("Сеть недоступна");
    } finally {
      setSaving(false);
    }
  };

  const columnOptions = boardOverride?.columns ?? snap?.columns ?? [];
  const laneOptions = boardOverride?.lanes ?? snap?.lanes ?? [];

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

  if (kaitenCardId == null) {
    const hasKaitenCreateFields =
      String(createKaitenCardTypeId).trim() !== "" &&
      trackLane != null &&
      columnId !== "";
    const canCreateFromCrm = workSent && hasKaitenCreateFields;

    const runCreate = async () => {
      setManualKaitenError(null);
      setCreateBusy(true);
      try {
        const res = await fetch(`/api/orders/${orderId}/kaiten`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
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

    return (
      <div className="max-w-xl space-y-4 text-sm">
        <p className="text-[var(--text-secondary)]">
          В CRM не сохранён id карточки Kaiten, поэтому эта вкладка пуста, хотя в Kaiten
          карточка может уже существовать. Типично так бывает, если API при создании
          вернул id в нестандартном формате (для новых нарядов учтено) или карточку
          перенесли/создали только в Kaiten.
        </p>
        {kaitenSyncError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-950 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100">
            <p className="font-medium">Записанная ошибка синхронизации</p>
            <p className="mt-1 whitespace-pre-wrap break-words font-mono text-xs">
              {kaitenSyncError}
            </p>
          </div>
        ) : null}
        {kaitenDecideLater ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
            Было отмечено «настроить Kaiten позже» — укажите тип, пространство и
            колонку ниже и нажмите кнопку: данные запишутся в наряд, карточка
            уйдёт в выбранное место на доске.
          </p>
        ) : null}

        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 space-y-3">
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            Создать привязку: тип карточки, пространство и колонка
          </p>
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-body)]">
            Тип карточки Kaiten
            <select
              className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-2 text-sm"
              value={String(createKaitenCardTypeId)}
              onChange={(e) => setCreateKaitenCardTypeId(e.target.value)}
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
          {noCardBoardError ? (
            <p className="text-xs text-amber-700 dark:text-amber-300/90">
              {noCardBoardError}
            </p>
          ) : null}
        </div>

        <div>
          <button
            type="button"
            disabled={!canCreateFromCrm || createBusy}
            onClick={() => void runCreate()}
            className={
              canCreateFromCrm
                ? "rounded-md border border-emerald-700 bg-emerald-700 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                : "rounded-md border border-[var(--border-default)] bg-[var(--panel)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] shadow-sm hover:bg-[var(--panel-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            }
          >
            {createBusy
              ? "Создаём…"
              : "Создать карточку в Kaiten / канбан"}
          </button>
          {!workSent ? (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Сначала отметьте в наряде «Работа отправлена» — тогда кнопка станет
              зелёной, когда будут выбраны тип, пространство и колонка.
            </p>
          ) : !hasKaitenCreateFields ? (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Укажите тип карточки, пространство и колонку выше, затем снова нажмите
              кнопку.
            </p>
          ) : null}
        </div>

        <div className="border-t border-[var(--border-subtle)] pt-4">
          <p className="mb-2 text-[var(--text-secondary)]">
            Карточка уже есть в Kaiten — укажите числовой id (из URL, например{" "}
            <code className="rounded bg-[var(--code-bg)] px-1">…/card/12345</code>) и
            привяжите.
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
          <p className="text-sm text-red-600 dark:text-red-400">{manualKaitenError}</p>
        ) : null}
      </div>
    );
  }

  if (loading) {
    return (
      <p className="text-sm text-[var(--text-muted)]">Загрузка Kaiten…</p>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
        <p>{loadError}</p>
        <button
          type="button"
          className="mt-2 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-950 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-50 dark:hover:bg-amber-900/40"
          onClick={() => void load({ refresh: true })}
        >
          Повторить (без кэша)
        </button>
      </div>
    );
  }

  const comments = snap?.comments ?? [];
  const roots = comments.filter((c) => c.parentId == null);
  const childrenOf = (pid: number) =>
    comments.filter((c) => c.parentId === pid);

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
        if (typeof t === "string") setTitle(t);
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
      <p className="text-xs text-[var(--text-muted)]">
        Данные подтягиваются из Kaiten и сохраняются туда же. Изменения в CRM и в
        Kaiten сходятся при нажатии «Сохранить в Kaiten» и после отправки
        сообщений.{" "}
        <button
          type="button"
          className="font-medium text-[var(--sidebar-blue)] hover:underline"
          onClick={() => void load({ refresh: true })}
        >
          Обновить из Kaiten
        </button>
      </p>

      {kaitenCardUrl ? (
        <a
          href={kaitenCardUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-sm font-medium text-[var(--sidebar-blue)] underline hover:no-underline"
        >
          Открыть карточку в Kaiten →
        </a>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-stretch lg:gap-4">
      <div className="order-2 flex min-h-0 flex-col rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-4 lg:h-full">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Блокировка (как в Kaiten)
        </h3>
        <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
          Состояние синхронизируется с карточкой: можно заблокировать здесь или в Kaiten
          — в списке заказов строка подсветится красным.
        </p>
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
                Текст причины в ответе API пуст — откройте карточку в Kaiten, чтобы
                увидеть формулировку.
              </p>
            )}
            <button
              type="button"
              disabled={blockBusy}
              onClick={() => void setBlockedInKaiten(false)}
              className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--text-strong)] shadow-sm hover:bg-[var(--table-row-hover)] disabled:opacity-50"
            >
              {blockBusy ? "Запрос…" : "Разблокировать в Kaiten"}
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
              {blockBusy ? "Запрос…" : "Заблокировать в Kaiten"}
            </button>
          </div>
        )}
      </div>

      <div className="order-3 flex min-h-0 flex-col rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-4 lg:h-full">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Шапка и положение на доске
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-body)] sm:col-span-2">
            Заголовок карточки
            <input
              className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-2 text-sm text-[var(--app-text)]"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              <option value="">— как в Kaiten —</option>
              {(snap?.spaces ?? []).map((s) => (
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
          {saving ? "Сохранение…" : "Сохранить в Kaiten"}
        </button>
      </div>

      <div className="order-1 flex min-h-[min(50vh,22rem)] flex-col rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 lg:min-h-0 lg:h-full">
        <h3 className="shrink-0 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Чат карточки
        </h3>
        <ul className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto lg:max-h-none max-h-[min(50vh,28rem)]">
          {roots.length === 0 ? (
            <li className="text-sm text-[var(--text-muted)]">Сообщений пока нет.</li>
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

        <textarea
          className="mt-2 min-h-[88px] w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-2 text-sm text-[var(--app-text)]"
          placeholder="Новое сообщение…"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
        />
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
    </div>
  );
}
