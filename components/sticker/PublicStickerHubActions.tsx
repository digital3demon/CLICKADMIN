"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AppModule, UserRole } from "@prisma/client";
import { canEditOrders } from "@/lib/auth/permissions";
import { PublicStickerSourceEmailsModal } from "@/components/sticker/PublicStickerSourceEmailsModal";

const btnBase =
  "block w-full rounded-lg border px-4 py-3 text-center text-sm font-medium transition-colors";

const menuItemBase =
  "block w-full px-4 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-55";

export function PublicStickerHubActions({
  tenantSlug,
  token,
  orderId,
  orderNumber,
  sourceEmailCount,
  staffUnlocked,
  canMarkWorkSent: canMarkWorkSentInitial,
  canMoveKanbanColumns: canMoveKanbanColumnsInitial,
  orderHref,
  kanbanHref,
  workSent: workSentInitial,
  initialCurrentColumnTitle = null,
  initialNextColumnTitle = null,
}: {
  tenantSlug: string;
  token: string;
  orderId: string;
  orderNumber: string;
  sourceEmailCount: number;
  /** Сессия сотрудника этой лаборатории (SSR). */
  staffUnlocked: boolean;
  /** OWNER или модуль ORDERS_EDIT — как PATCH наряда. */
  canMarkWorkSent: boolean;
  /** Модуль KANBAN_MOVE_COLUMNS. */
  canMoveKanbanColumns: boolean;
  orderHref: string;
  kanbanHref: string;
  workSent: boolean;
  initialCurrentColumnTitle?: string | null;
  initialNextColumnTitle?: string | null;
}) {
  const [lettersOpen, setLettersOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [workSent, setWorkSent] = useState(workSentInitial);
  const [canMarkWorkSent, setCanMarkWorkSent] = useState(canMarkWorkSentInitial);
  const [canMoveKanbanColumns, setCanMoveKanbanColumns] = useState(
    canMoveKanbanColumnsInitial,
  );
  const [shipBusy, setShipBusy] = useState(false);
  const [shipMsg, setShipMsg] = useState<string | null>(null);
  const [currentColumnTitle, setCurrentColumnTitle] = useState(
    initialCurrentColumnTitle,
  );
  const [nextColumnTitle, setNextColumnTitle] = useState(initialNextColumnTitle);
  const [advanceBusy, setAdvanceBusy] = useState(false);
  const [advanceMsg, setAdvanceMsg] = useState<string | null>(null);
  const menuWrapRef = useRef<HTMLDivElement | null>(null);
  const showLetters = sourceEmailCount > 0;

  useEffect(() => {
    setWorkSent(workSentInitial);
  }, [workSentInitial]);

  useEffect(() => {
    setCanMarkWorkSent(canMarkWorkSentInitial);
  }, [canMarkWorkSentInitial]);

  useEffect(() => {
    setCanMoveKanbanColumns(canMoveKanbanColumnsInitial);
  }, [canMoveKanbanColumnsInitial]);

  useEffect(() => {
    setCurrentColumnTitle(initialCurrentColumnTitle);
    setNextColumnTitle(initialNextColumnTitle);
  }, [initialCurrentColumnTitle, initialNextColumnTitle]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = menuWrapRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function refreshColumnNeighbor() {
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(orderId)}/kanban-next-column`,
        { credentials: "include", cache: "no-store" },
      );
      const data = (await res.json().catch(() => ({}))) as {
        found?: boolean;
        currentTitle?: string | null;
        nextTitle?: string | null;
      };
      if (!res.ok) return;
      if (data.found) {
        setCurrentColumnTitle(data.currentTitle ?? null);
        setNextColumnTitle(data.nextTitle ?? null);
      } else {
        setCurrentColumnTitle(null);
        setNextColumnTitle(null);
      }
    } catch {
      /* ignore */
    }
  }

  async function tryOpenStaffMenu() {
    setStaffError(null);
    setShipMsg(null);
    setAdvanceMsg(null);
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/session", {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as {
        user?: {
          id?: string;
          role?: UserRole;
          moduleAccess?: Partial<Record<AppModule, boolean>> | null;
        } | null;
        demo?: boolean;
      } | null;
      const loggedIn = Boolean(data?.user?.id) && !data?.demo;
      if (!loggedIn) {
        setMenuOpen(false);
        setStaffError(
          "Нужен вход в CRM в этом браузере. Откройте CRM, войдите и обновите эту страницу.",
        );
        return;
      }
      if (!staffUnlocked) {
        setMenuOpen(false);
        setStaffError(
          "Вы вошли не в ту лабораторию или сессия не подходит. Войдите в CRM этой лаборатории и обновите страницу.",
        );
        return;
      }
      const role = data?.user?.role;
      const access = data?.user?.moduleAccess;
      if (role) {
        setCanMarkWorkSent(canEditOrders(role, access));
        setCanMoveKanbanColumns(access?.KANBAN_MOVE_COLUMNS === true);
      }
      setMenuOpen(true);
      void refreshColumnNeighbor();
    } catch {
      setMenuOpen(false);
      setStaffError("Не удалось проверить вход. Попробуйте ещё раз.");
    }
  }

  async function markWorkSent() {
    if (shipBusy) return;
    if (!canMarkWorkSent) {
      setShipMsg("Нет прав отмечать отправку (нужно редактирование нарядов).");
      return;
    }
    if (workSent) {
      setShipMsg("Уже отмечено: работа отправлена.");
      return;
    }
    setShipBusy(true);
    setShipMsg(null);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminShippedOtpr: true }),
      });
      if (res.status === 401) {
        setMenuOpen(false);
        setStaffError("Сессия истекла. Войдите в CRM и повторите.");
        return;
      }
      if (res.status === 403) {
        setCanMarkWorkSent(false);
        setShipMsg("Нет прав отмечать отправку (нужно редактирование нарядов).");
        return;
      }
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setShipMsg(err?.error ?? "Не удалось отметить отправку.");
        return;
      }
      setWorkSent(true);
      setShipMsg("Отмечено: работа отправлена.");
    } catch {
      setShipMsg("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setShipBusy(false);
    }
  }

  async function advanceKanbanColumn() {
    if (advanceBusy || !canMoveKanbanColumns || !nextColumnTitle) return;
    setAdvanceBusy(true);
    setAdvanceMsg(null);
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(orderId)}/kanban-next-column`,
        { method: "POST", credentials: "include" },
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        fromTitle?: string;
        toTitle?: string;
        kaitenError?: string | null;
      };
      if (res.status === 401) {
        setMenuOpen(false);
        setStaffError("Сессия истекла. Войдите в CRM и повторите.");
        return;
      }
      if (res.status === 403) {
        setCanMoveKanbanColumns(false);
        setAdvanceMsg("Нет прав перемещать карточки по колонкам.");
        return;
      }
      if (!res.ok) {
        setAdvanceMsg(data.error ?? "Не удалось перенести карточку.");
        return;
      }
      setAdvanceMsg(
        data.kaitenError
          ? `Этап: «${data.toTitle}» (CRM). ${data.kaitenError}`
          : `Этап: «${data.toTitle}»`,
      );
      await refreshColumnNeighbor();
    } catch {
      setAdvanceMsg("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setAdvanceBusy(false);
    }
  }

  const advanceLabel =
    currentColumnTitle && nextColumnTitle
      ? `${currentColumnTitle} → ${nextColumnTitle}`
      : null;

  return (
    <>
      <div className="mt-6 space-y-2 border-t border-zinc-100 pt-5">
        {showLetters ? (
          <button
            type="button"
            className={`${btnBase} border-violet-200 bg-violet-50 text-violet-950 hover:bg-violet-100`}
            onClick={() => setLettersOpen(true)}
          >
            Письма от заказа
            {sourceEmailCount > 1 ? (
              <span className="ml-1.5 tabular-nums text-violet-700/80">
                ({sourceEmailCount})
              </span>
            ) : null}
          </button>
        ) : null}

        <a
          href="https://t.me/CLICKlab_Admin"
          target="_blank"
          rel="noopener noreferrer"
          className={`${btnBase} border-sky-300 bg-sky-50 text-sky-950 hover:bg-sky-100`}
        >
          Написать Администраторам
        </a>

        <div ref={menuWrapRef} className="relative">
          <button
            type="button"
            className={`${btnBase} border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-zinc-200`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => void tryOpenStaffMenu()}
          >
            Для сотрудников
            <span className="ml-1.5 inline-block text-zinc-500" aria-hidden>
              {menuOpen ? "▴" : "▾"}
            </span>
          </button>

          {staffError ? (
            <p
              className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-left text-xs text-red-800"
              role="alert"
            >
              {staffError}
            </p>
          ) : null}

          {menuOpen ? (
            <div
              role="menu"
              className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg"
            >
              <Link
                role="menuitem"
                href={orderHref}
                className={`${menuItemBase} text-zinc-900 hover:bg-zinc-50`}
                onClick={() => setMenuOpen(false)}
              >
                Открыть заказ
              </Link>
              <Link
                role="menuitem"
                href={kanbanHref}
                className={`${menuItemBase} border-t border-zinc-100 text-zinc-900 hover:bg-zinc-50`}
                onClick={() => setMenuOpen(false)}
              >
                Открыть канбан
              </Link>
              {canMoveKanbanColumns && advanceLabel ? (
                <button
                  type="button"
                  role="menuitem"
                  disabled={advanceBusy}
                  title={`Перенести карточку: ${advanceLabel}`}
                  className={`${menuItemBase} border-t border-zinc-100 font-medium text-sky-950 hover:bg-sky-50`}
                  onClick={() => void advanceKanbanColumn()}
                >
                  {advanceBusy ? "Перенос…" : advanceLabel}
                </button>
              ) : canMoveKanbanColumns && currentColumnTitle && !nextColumnTitle ? (
                <p className="border-t border-zinc-100 px-4 py-2 text-xs text-zinc-500">
                  Уже на последней колонке («{currentColumnTitle}»)
                </p>
              ) : canMoveKanbanColumns ? (
                <p className="border-t border-zinc-100 px-4 py-2 text-xs text-zinc-500">
                  Карточка в канбане не найдена
                </p>
              ) : null}
              {advanceMsg ? (
                <p className="border-t border-zinc-100 px-4 py-2 text-xs text-zinc-600">
                  {advanceMsg}
                </p>
              ) : null}
              <button
                type="button"
                role="menuitem"
                disabled={shipBusy || !canMarkWorkSent}
                title={
                  canMarkWorkSent
                    ? workSent
                      ? "Уже отмечено"
                      : "Отметить работу отправленной"
                    : "Нужны права на редактирование нарядов"
                }
                className={`${menuItemBase} border-t border-zinc-100 ${
                  canMarkWorkSent
                    ? workSent
                      ? "font-medium text-emerald-800 hover:bg-emerald-50"
                      : "text-zinc-900 hover:bg-emerald-50"
                    : "text-zinc-400"
                }`}
                onClick={() => void markWorkSent()}
              >
                {workSent
                  ? "Работа отправлена ✓"
                  : canMarkWorkSent
                    ? "Работа отправлена"
                    : "Работа отправлена (нет прав)"}
              </button>
              {shipMsg ? (
                <p className="border-t border-zinc-100 px-4 py-2 text-xs text-zinc-600">
                  {shipMsg}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {lettersOpen ? (
        <PublicStickerSourceEmailsModal
          tenantSlug={tenantSlug}
          token={token}
          orderNumber={orderNumber}
          onClose={() => setLettersOpen(false)}
        />
      ) : null}
    </>
  );
}
