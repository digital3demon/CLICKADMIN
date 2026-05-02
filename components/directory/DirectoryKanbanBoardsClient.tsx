"use client";

import type { UserRole } from "@prisma/client";
import type { KanbanBoard } from "@/lib/kanban/types";
import {
  clearKanbanBrowserStorage,
  createInitialBoard,
  defaultAppState,
  demoKanbanDefaultState,
  generateId,
  getActiveBoard,
  isKanbanAggregateBoardId,
  KANBAN_BOARD_ORTHOPEDICS_ID,
  loadKanbanState,
  migrateBoard,
  normalizeBoardCardTypes,
  normalizeDemoKanbanAppState,
  saveKanbanState,
  withActiveBoard,
} from "@/lib/kanban/model";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KanbanAutomationsForm } from "@/components/kanban/KanbanAutomationsForm";
import { KanbanBoardSettingsForm } from "@/components/kanban/KanbanBoardSettingsForm";
import { IconBoard, IconPlus } from "@/components/kanban/kanban-icons";
import { readClientState, writeClientState } from "@/lib/client-state-client";

type ToastItem = { id: string; text: string; err?: boolean };
type CrmUserPick = { id: string; displayName: string; email: string };

function loadKanbanStateForDirectory(isDemo: boolean) {
  const raw = isDemo
    ? normalizeDemoKanbanAppState(loadKanbanState(true))
    : loadKanbanState(false);
  if (isDemo || !isKanbanAggregateBoardId(raw.activeBoardId)) return raw;
  const next = structuredClone(raw);
  next.activeBoardId =
    next.boards.find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)?.id ??
    next.boards[0]?.id ??
    next.activeBoardId;
  return next;
}

export function DirectoryKanbanBoardsClient({
  isDemo = false,
  sessionRole,
}: {
  isDemo?: boolean;
  sessionRole: UserRole;
}) {
  const [appState, setAppState] = useState(() => loadKanbanStateForDirectory(isDemo));
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirm, setConfirm] = useState<{
    message: string;
    onOk: () => void;
  } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const canSetPrivateBoards =
    !isDemo && (sessionRole === "OWNER" || sessionRole === "MANAGER");
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createPrivate, setCreatePrivate] = useState(false);
  const [crmUsers, setCrmUsers] = useState<CrmUserPick[]>([]);
  const [pickedUserIds, setPickedUserIds] = useState<string[]>([]);

  useEffect(() => {
    saveKanbanState(appState, isDemo);
    const key = isDemo ? "kanbanAppStateV3Demo" : "kanbanAppStateV3";
    const scope = isDemo ? "user" : "tenant";
    void writeClientState(scope, key, appState);
  }, [appState, isDemo]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const key = isDemo ? "kanbanAppStateV3Demo" : "kanbanAppStateV3";
      const scope = isDemo ? "user" : "tenant";
      const remote = await readClientState<unknown>(scope, key);
      if (cancelled || !remote || typeof remote !== "object") return;
      setAppState(remote as ReturnType<typeof loadKanbanStateForDirectory>);
      saveKanbanState(remote as ReturnType<typeof loadKanbanStateForDirectory>, isDemo);
    })();
    return () => {
      cancelled = true;
    };
  }, [isDemo]);

  useEffect(() => {
    if (!canSetPrivateBoards) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/kanban/crm-users", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) return;
        const j = (await res.json().catch(() => ({}))) as {
          users?: Array<{ id: string; displayName: string; email: string }>;
        };
        if (cancelled) return;
        const rows = Array.isArray(j.users) ? j.users : [];
        setCrmUsers(
          rows
            .filter((u) => typeof u.id === "string" && u.id.trim())
            .map((u) => ({
              id: u.id,
              displayName: u.displayName || u.email || "Пользователь",
              email: u.email || "",
            })),
        );
      } catch {
        if (!cancelled) setCrmUsers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canSetPrivateBoards]);

  const board = useMemo(() => getActiveBoard(appState), [appState]);

  const showToast = useCallback((text: string, err?: boolean) => {
    const id = generateId("toast");
    setToasts((t) => [...t, { id, text, err }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  const applyToBoard = useCallback((fn: (b: KanbanBoard) => void) => {
    setAppState((s) => withActiveBoard(s, fn));
  }, []);

  const patchApp = useCallback((fn: (s: typeof appState) => void) => {
    setAppState((s) => {
      const next = structuredClone(s);
      fn(next);
      return next;
    });
  }, []);

  const exportBoard = () => {
    const b = getActiveBoard(appState);
    const blob = new Blob([JSON.stringify(b, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `board-${b.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("Доска экспортирована");
  };

  const importBoardFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as KanbanBoard;
        if (!data.columns || !Array.isArray(data.columns))
          throw new Error("Неверный формат");
        if (!data.id) data.id = generateId("board");
        data.title = data.title || "Импортированная доска";
        migrateBoard(data);
        patchApp((s) => {
          s.boards.push(data);
          s.activeBoardId = data.id;
        });
        showToast("Доска импортирована");
      } catch (e) {
        console.error(e);
        showToast(
          "Ошибка импорта: " + (e instanceof Error ? e.message : "неверный JSON"),
          true,
        );
      }
    };
    reader.readAsText(file);
  };

  const saveNormalized = () => {
    applyToBoard((b) => normalizeBoardCardTypes(b));
    showToast("Настройки доски сохранены");
  };

  const openCreateModal = () => {
    setCreateTitle(`Доска ${appState.boards.length + 1}`);
    setCreatePrivate(false);
    setPickedUserIds([]);
    setCreateOpen(true);
  };

  const createBoard = () => {
    const title = createTitle.trim();
    if (!title) {
      showToast("Введите название доски", true);
      return;
    }
    if (createPrivate && pickedUserIds.length < 1) {
      showToast("Для закрытой доски выберите хотя бы одного пользователя", true);
      return;
    }
    const nb = createInitialBoard();
    nb.id = generateId("board");
    nb.title = title;
    nb.isPrivate = createPrivate;
    nb.accessUserIds = createPrivate ? [...pickedUserIds] : [];
    patchApp((s) => {
      s.boards.push(nb);
      s.activeBoardId = nb.id;
    });
    setCreateOpen(false);
    showToast(createPrivate ? "Создана закрытая доска" : "Создана новая доска");
  };

  return (
    <>
      <div className="space-y-8">
        <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h2 className="m-0 text-base font-semibold text-[var(--app-text)]">
            Доски
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {isDemo ? (
              <>
                В демо доступна одна доска «Работы»; на ней только карточки нарядов.
                Данные в браузере (localStorage), как на{" "}
                <Link
                  href="/kanban"
                  className="text-[var(--sidebar-blue)] hover:underline"
                >
                  Канбан
                </Link>
                .
              </>
            ) : (
              <>
                Выберите активную доску — для неё ниже настраиваются типы карточек и
                участники. Данные хранятся в браузере (localStorage), как на странице{" "}
                <Link
                  href="/kanban"
                  className="text-[var(--sidebar-blue)] hover:underline"
                >
                  Канбан
                </Link>
                .
              </>
            )}
          </p>
          <ul className="mt-4 max-h-[220px] list-none space-y-1 overflow-y-auto p-0">
            {appState.boards.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  className={`flex w-full max-w-lg items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm ${
                    b.id === appState.activeBoardId
                      ? "bg-[color-mix(in_srgb,var(--sidebar-blue)_12%,transparent)] font-semibold text-[var(--app-text)]"
                      : "text-[var(--app-text)] hover:bg-[var(--surface-hover)]"
                  }`}
                  onClick={() => {
                    patchApp((s) => {
                      s.activeBoardId = b.id;
                    });
                    showToast(`Активная доска: ${b.title}`);
                  }}
                >
                  <IconBoard aria-hidden />
                  {b.title}
                  {b.isPrivate ? (
                    <span className="ml-2 rounded border border-amber-500/40 bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
                      Закрытая
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {!isDemo ? (
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm hover:bg-[var(--surface-hover)]"
                onClick={openCreateModal}
              >
                <IconPlus /> Новая доска
              </button>
            ) : null}
            {!isDemo ? (
              <button
                type="button"
                className="rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm hover:bg-[var(--surface-hover)]"
                onClick={() => {
                  const t = window.prompt("Название доски:", board.title);
                  if (t === null) return;
                  const title = t.trim();
                  if (!title) return;
                  applyToBoard((b) => {
                    b.title = title;
                  });
                  showToast("Название обновлено");
                }}
              >
                Переименовать…
              </button>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h2 className="m-0 text-base font-semibold text-[var(--app-text)]">
            Типы карточек и участники
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Относится к доске «{board.title}». Изменения сохраняются автоматически;
            кнопка ниже приводит типы к единому виду (цвета и порядок).
          </p>
          <div className="mt-6">
            <KanbanBoardSettingsForm board={board} onPatchBoard={applyToBoard} />
          </div>
          <div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--card-border)] pt-4">
            <button
              type="button"
              className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-95"
              onClick={saveNormalized}
            >
              Сохранить порядок типов
            </button>
          </div>
        </section>

        <section
          id="kanban-automations"
          className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm"
        >
          <h2 className="m-0 text-base font-semibold text-[var(--app-text)]">
            Автоматизации
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Для активной доски «{board.title}»: если условие выполнено — выполняются действия
            (перенос, срок, тип, ответственный, комментарий, блокировка). Данные в браузере.
          </p>
          <div className="mt-6">
            <KanbanAutomationsForm board={board} onPatchBoard={applyToBoard} />
          </div>
        </section>

        <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h2 className="m-0 text-base font-semibold text-[var(--app-text)]">
            Резервная копия
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Экспорт и импорт JSON относятся к <strong>активной</strong> доске.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm hover:bg-[var(--surface-hover)]"
              onClick={exportBoard}
            >
              Экспорт JSON (текущая доска)
            </button>
            {!isDemo ? (
              <>
                <button
                  type="button"
                  className="rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm hover:bg-[var(--surface-hover)]"
                  onClick={() => importRef.current?.click()}
                >
                  Импорт JSON
                </button>
                <input
                  ref={importRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) importBoardFile(f);
                  }}
                />
              </>
            ) : null}
          </div>
        </section>
      </div>

      {createOpen ? (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCreateOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-[var(--app-text)] shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="m-0 text-base font-semibold">Новая доска</h3>
            <label className="mt-3 block text-sm">
              <span className="mb-1 block text-[var(--text-secondary)]">Название</span>
              <input
                type="text"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--app-text)]"
                autoFocus
              />
            </label>
            {canSetPrivateBoards ? (
              <>
                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={createPrivate}
                    onChange={(e) => {
                      setCreatePrivate(e.target.checked);
                      if (!e.target.checked) setPickedUserIds([]);
                    }}
                  />
                  Закрытая доска
                </label>
                {createPrivate ? (
                  <div className="mt-3 rounded-md border border-[var(--card-border)] p-3">
                    <p className="m-0 text-xs text-[var(--text-secondary)]">
                      Выберите пользователей, у кого будет доступ к доске.
                    </p>
                    <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
                      {crmUsers.map((u) => {
                        const checked = pickedUserIds.includes(u.id);
                        return (
                          <label
                            key={u.id}
                            className="flex cursor-pointer items-center justify-between gap-3 rounded px-2 py-1.5 text-sm hover:bg-[var(--surface-hover)]"
                          >
                            <span className="truncate">
                              {u.displayName}
                              {u.email ? (
                                <span className="ml-1 text-xs text-[var(--text-muted)]">
                                  ({u.email})
                                </span>
                              ) : null}
                            </span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setPickedUserIds((prev) =>
                                  e.target.checked
                                    ? [...prev, u.id]
                                    : prev.filter((id) => id !== u.id),
                                );
                              }}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-[var(--card-border)] px-4 py-2 text-sm hover:bg-[var(--surface-hover)]"
                onClick={() => setCreateOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-95"
                onClick={createBoard}
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirm && (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/45 p-4"
          role="alertdialog"
          aria-modal
        >
          <div className="w-full max-w-md rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-[var(--app-text)] shadow-xl">
            <p className="m-0 text-sm leading-relaxed">{confirm.message}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-[var(--card-border)] px-4 py-2 text-sm hover:bg-[var(--surface-hover)]"
                onClick={() => setConfirm(null)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
                onClick={confirm.onOk}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed bottom-4 right-4 z-[230] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-md px-4 py-2 text-sm text-white shadow-lg ${
              t.err ? "bg-red-800" : "bg-zinc-800"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </>
  );
}
