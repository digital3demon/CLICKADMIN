"use client";

import { useEffect, useMemo, useState } from "react";
import type { KanbanBoard, KanbanCard } from "@/lib/kanban/types";
import {
  formatKanbanTimerCountdown,
  kanbanCardTimerDisplayNowMs,
  kanbanCardTimerElapsedRatio,
  kanbanCardTimerRemainingMs,
  kanbanCardTimerTrackFillColor,
} from "@/lib/kanban/kanban-card-timer";
import { persistKanbanLinkedCardTimer } from "@/lib/kanban/persist-crm-board-fields-client";
import { findCard, pushActivity } from "@/lib/kanban/model";

function durationPartsFromMs(ms: number | null | undefined): {
  days: number;
  hours: number;
  minutes: number;
} {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) {
    return { days: 0, hours: 0, minutes: 0 };
  }
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const minutes = totalMin % 60;
  return { days, hours, minutes };
}

function msFromParts(days: number, hours: number, minutes: number): number {
  const d = Math.max(0, Math.floor(days));
  const h = Math.min(23, Math.max(0, Math.floor(hours)));
  const m = Math.min(59, Math.max(0, Math.floor(minutes)));
  return ((d * 24 + h) * 60 + m) * 60 * 1000;
}

export function KanbanCardTimerBlock({
  card,
  cardId,
  onApply,
  activityActorLabel,
  canManage,
  sessionUserId,
}: {
  card: KanbanCard;
  cardId: string;
  onApply: (fn: (b: KanbanBoard) => void) => void;
  activityActorLabel?: string;
  canManage: boolean;
  /** Текущий пользователь CRM — для «Оставить таймер» как участник/ответственный. */
  sessionUserId?: string | null;
}) {
  const act = (activityActorLabel ?? "").trim() || undefined;
  const [now, setNow] = useState(() => Date.now());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [daysDraft, setDaysDraft] = useState("0");
  const [hoursDraft, setHoursDraft] = useState("0");
  const [minutesDraft, setMinutesDraft] = useState("30");

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const started = Boolean(card.timerStartedAt && card.timerDurationMs && card.timerDurationMs > 0);
  const displayNow = useMemo(
    () => kanbanCardTimerDisplayNowMs(card.timerFrozenAt, now),
    [card.timerFrozenAt, now],
  );
  const ratio = useMemo(
    () =>
      kanbanCardTimerElapsedRatio(
        card.timerStartedAt,
        card.timerDurationMs,
        displayNow,
      ),
    [card.timerStartedAt, card.timerDurationMs, displayNow],
  );
  const remaining = useMemo(
    () =>
      kanbanCardTimerRemainingMs(
        card.timerStartedAt,
        card.timerDurationMs,
        displayNow,
      ),
    [card.timerStartedAt, card.timerDurationMs, displayNow],
  );
  const label = formatKanbanTimerCountdown(remaining);
  const fillColor = kanbanCardTimerTrackFillColor(ratio);

  const uid = String(sessionUserId || "").trim();
  const canFreezeTimer = useMemo(() => {
    if (!started || !uid) return canManage;
    const a = card.assignees || [];
    const p = card.participants || [];
    if (a.includes(uid) || p.includes(uid)) return true;
    return canManage;
  }, [started, uid, card.assignees, card.participants, canManage]);

  const openSettings = () => {
    const p = durationPartsFromMs(card.timerDurationMs);
    const empty = p.days === 0 && p.hours === 0 && p.minutes === 0;
    setDaysDraft(String(p.days));
    setHoursDraft(String(p.hours));
    setMinutesDraft(String(empty ? 30 : Math.max(1, p.minutes)));
    setSettingsOpen(true);
  };

  const applyTimer = (opts: { start: boolean }) => {
    const d = Number(daysDraft) || 0;
    const h = Number(hoursDraft) || 0;
    const m = Number(minutesDraft) || 0;
    const ms = msFromParts(d, h, m);
    if (ms < 60_000) {
      window.alert("Минимальный интервал — 1 минута.");
      return;
    }
    onApply((b) => {
      const fc = findCard(b, cardId);
      if (!fc) return;
      fc.card.timerDurationMs = ms;
      fc.card.timerFrozenAt = null;
      if (opts.start) {
        fc.card.timerStartedAt = new Date().toISOString();
        pushActivity(
          fc.card,
          `Таймер запущен на ${Math.round(ms / 60000)} мин.`,
          b.users[0]?.id,
          b,
          act,
        );
      }
      fc.card.updatedAt = new Date().toISOString();
      persistKanbanLinkedCardTimer(fc.card);
    });
    setSettingsOpen(false);
  };

  const clearTimer = () => {
    onApply((b) => {
      const fc = findCard(b, cardId);
      if (!fc) return;
      fc.card.timerStartedAt = null;
      fc.card.timerDurationMs = null;
      fc.card.timerFrozenAt = null;
      fc.card.updatedAt = new Date().toISOString();
      pushActivity(fc.card, "Таймер сброшен", b.users[0]?.id, b, act);
      persistKanbanLinkedCardTimer(fc.card);
    });
    setSettingsOpen(false);
  };

  const startOnly = () => {
    if (!card.timerDurationMs || card.timerDurationMs < 60_000) {
      window.alert("Сначала задайте длительность и сохраните.");
      return;
    }
    onApply((b) => {
      const fc = findCard(b, cardId);
      if (!fc) return;
      fc.card.timerStartedAt = new Date().toISOString();
      fc.card.timerFrozenAt = null;
      fc.card.updatedAt = new Date().toISOString();
      pushActivity(fc.card, "Таймер запущен", b.users[0]?.id, b, act);
      persistKanbanLinkedCardTimer(fc.card);
    });
  };

  const freezeTimer = () => {
    onApply((b) => {
      const fc = findCard(b, cardId);
      if (!fc) return;
      fc.card.timerFrozenAt = new Date().toISOString();
      fc.card.updatedAt = new Date().toISOString();
      pushActivity(fc.card, "Таймер оставлен (заморозка отображения)", b.users[0]?.id, b, act);
      persistKanbanLinkedCardTimer(fc.card);
    });
  };

  const resumeTimer = () => {
    onApply((b) => {
      const fc = findCard(b, cardId);
      if (!fc) return;
      fc.card.timerFrozenAt = null;
      fc.card.updatedAt = new Date().toISOString();
      pushActivity(fc.card, "Таймер снова в отсчёте", b.users[0]?.id, b, act);
      persistKanbanLinkedCardTimer(fc.card);
    });
  };

  return (
    <div className="relative mb-3 rounded-lg border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)]/40 px-3 py-2.5 max-md:mb-2 max-md:px-2 max-md:py-1.5">
      <div className="mb-1 flex items-center gap-1.5 max-md:mb-0.5 sm:gap-2">
        <span className="text-[0.625rem] font-medium uppercase tracking-wide text-[var(--kaiten-modal-muted)]">
          Таймер
        </span>
        {canManage ? (
          <button
            type="button"
            className="inline-flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] text-[var(--kaiten-modal-text)] hover:bg-[var(--kaiten-modal-input)]"
            onClick={() => (settingsOpen ? setSettingsOpen(false) : openSettings())}
            aria-label="Добавить таймер"
            title="Добавить таймер"
          >
            <span className="text-[0.65rem] font-semibold leading-none">+</span>
          </button>
        ) : null}
      </div>
      {started ? (
        <div className="flex items-center gap-3 max-md:gap-2">
          <span
            className="min-w-[5.5rem] font-mono text-[0.95rem] font-semibold tabular-nums text-[var(--kaiten-modal-text)] max-md:min-w-[4.25rem] max-md:text-[0.8rem]"
            title={
              card.timerFrozenAt
                ? "Заморозка: остаток и цвет зафиксированы на момент «Оставить таймер»"
                : "Осталось до конца интервала"
            }
          >
            {label}
          </span>
          <div className="min-w-0 flex-1">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/35 ring-1 ring-[var(--kaiten-modal-border)] max-md:h-1.5">
              <div
                className="h-full min-w-[2px] rounded-full transition-[width,background-color] duration-300 ease-linear"
                style={{
                  width: `${Math.max(0.5, Math.round(ratio * 1000) / 10)}%`,
                  backgroundColor: fillColor,
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
      {!canManage ? (
        <p className="mt-1.5 text-[0.65rem] leading-snug text-[var(--kaiten-modal-muted)]">
          Таймер виден всем; назначать и менять интервал могут роли с правом «Канбан: назначать таймеры» в настройках доступа.
        </p>
      ) : null}
      {!started && canManage && card.timerDurationMs && card.timerDurationMs >= 60_000 ? (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            className="text-[0.72rem] font-medium text-[var(--kaiten-accent,#9333ea)] underline-offset-2 hover:underline"
            onClick={() => startOnly()}
          >
            Запустить отсчёт
          </button>
        </div>
      ) : null}
      {started && canFreezeTimer ? (
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          {!card.timerFrozenAt ? (
            <button
              type="button"
              className="text-[0.72rem] font-medium text-[var(--kaiten-modal-muted)] underline-offset-2 hover:text-[var(--kaiten-modal-text)] hover:underline"
              onClick={() => freezeTimer()}
            >
              Оставить таймер
            </button>
          ) : (
            <button
              type="button"
              className="text-[0.72rem] font-medium text-[var(--kaiten-accent,#9333ea)] underline-offset-2 hover:underline"
              onClick={() => resumeTimer()}
            >
              Продолжить отсчёт
            </button>
          )}
        </div>
      ) : null}

      {settingsOpen && canManage ? (
        <div
          className="fixed inset-0 z-[240] flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSettingsOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-label="Настройки таймера"
            className="w-full max-w-sm rounded-xl border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-bg)] p-4 text-[var(--kaiten-modal-text)] shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="m-0 text-sm font-semibold">Интервал таймера</h3>
            <p className="mt-1 text-[0.72rem] text-[var(--kaiten-modal-muted)]">
              Сутки, часы и минуты. После сохранения можно запустить отсчёт отдельной кнопкой или сразу.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <label className="text-[0.7rem]">
                <span className="block text-[var(--kaiten-modal-muted)]">Суток</span>
                <input
                  type="number"
                  min={0}
                  className="mt-0.5 w-full rounded border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-2 py-1 text-sm"
                  value={daysDraft}
                  onChange={(e) => setDaysDraft(e.target.value)}
                />
              </label>
              <label className="text-[0.7rem]">
                <span className="block text-[var(--kaiten-modal-muted)]">Часов</span>
                <input
                  type="number"
                  min={0}
                  max={23}
                  className="mt-0.5 w-full rounded border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-2 py-1 text-sm"
                  value={hoursDraft}
                  onChange={(e) => setHoursDraft(e.target.value)}
                />
              </label>
              <label className="text-[0.7rem]">
                <span className="block text-[var(--kaiten-modal-muted)]">Минут</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  className="mt-0.5 w-full rounded border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-2 py-1 text-sm"
                  value={minutesDraft}
                  onChange={(e) => setMinutesDraft(e.target.value)}
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[var(--kaiten-modal-border)] pt-3">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-[0.8rem] text-[var(--kaiten-modal-muted)] hover:bg-[var(--kaiten-modal-control)]"
                onClick={() => setSettingsOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-[0.8rem] text-red-500 hover:bg-red-950/40"
                onClick={() => clearTimer()}
              >
                Сбросить
              </button>
              <button
                type="button"
                className="rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] px-3 py-1.5 text-[0.8rem]"
                onClick={() => applyTimer({ start: false })}
              >
                Сохранить
              </button>
              <button
                type="button"
                className="rounded-md bg-[var(--sidebar-blue)] px-3 py-1.5 text-[0.8rem] font-semibold text-white"
                onClick={() => applyTimer({ start: true })}
              >
                Сохранить и запустить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
