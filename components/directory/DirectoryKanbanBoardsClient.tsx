"use client";

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

type ToastItem = { id: string; text: string; err?: boolean };

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

export function DirectoryKanbanBoardsClient({ isDemo = false }: { isDemo?: boolean }) {
  const [appState, setAppState] = useState(() => loadKanbanStateForDirectory(isDemo));
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirm, setConfirm] = useState<{
    message: string;
    onOk: () => void;
  } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveKanbanState(appState, isDemo);
  }, [appState, isDemo]);

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

  const resetAll = () => {
    setConfirm({
      message: isDemo
        ? "Сбросить канбан демо? Останется одна доска «Работы» без лишних карточек."
        : "Сбросить всё к начальному примеру? Текущие данные будут потеряны.",
      onOk: () => {
        clearKanbanBrowserStorage(isDemo);
        setAppState(isDemo ? demoKanbanDefaultState() : defaultAppState());
        showToast("Состояние сброшено");
        setConfirm(null);
      },
    });
  };

  const saveNormalized = () => {
    applyToBoard((b) => normalizeBoardCardTypes(b));
    showToast("Настройки доски сохранены");
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
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {!isDemo ? (
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm hover:bg-[var(--surface-hover)]"
                onClick={() => {
                  const nb = createInitialBoard();
                  nb.id = generateId("board");
                  nb.title = `Доска ${appState.boards.length + 1}`;
                  patchApp((s) => {
                    s.boards.push(nb);
                    s.activeBoardId = nb.id;
                  });
                  showToast("Создана новая доска");
                }}
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
            Сброс удаляет все локальные доски канбана в этом браузере.
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
            <button
              type="button"
              className="rounded-md border border-red-800/40 bg-red-50 px-3 py-2 text-sm text-red-900 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-100 dark:hover:bg-red-950/60"
              onClick={resetAll}
            >
              Сброс данных канбана
            </button>
          </div>
        </section>
      </div>

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
