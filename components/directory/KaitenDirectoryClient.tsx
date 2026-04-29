"use client";

import { useCallback, useEffect, useState } from "react";
import { KANBAN_KAITEN_CARD_TYPES_SYNCED_EVENT } from "@/lib/kanban/model";

type CardTypeRow = {
  id: string;
  name: string;
  externalTypeId: number;
  sortOrder: number;
  isActive: boolean;
};

export function KaitenDirectoryClient() {
  const [types, setTypes] = useState<CardTypeRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newSort, setNewSort] = useState("0");
  const [typeMsg, setTypeMsg] = useState<string | null>(null);
  const [typeOkHint, setTypeOkHint] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{
    tone: "ok" | "warn" | "err";
    lines: string[];
  } | null>(null);

  const loadTypes = useCallback(async () => {
    const res = await fetch("/api/kaiten-card-types?all=1");
    const data = (await res.json()) as CardTypeRow[] | { error?: string };
    if (!res.ok) {
      throw new Error(
        typeof data === "object" && data && "error" in data
          ? String(data.error)
          : "Ошибка типов",
      );
    }
    setTypes(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    setLoadError(null);
    void loadTypes().catch((e) => {
      setLoadError(e instanceof Error ? e.message : "Ошибка загрузки");
    });
  }, [loadTypes]);

  async function addType(e: React.FormEvent) {
    e.preventDefault();
    setTypeMsg(null);
    setTypeOkHint(null);
    const so = Number.parseInt(newSort, 10);
    setAddBusy(true);
    try {
      const res = await fetch("/api/kaiten-card-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newName.trim(),
          sortOrder: Number.isFinite(so) ? so : 0,
          isActive: true,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        kaitenAmbiguousName?: boolean;
        externalTypeId?: number;
      };
      if (!res.ok) {
        setTypeMsg(data.error ?? "Не создано");
        return;
      }
      setNewName("");
      setNewSort("0");
      const idHint =
        typeof data.externalTypeId === "number"
          ? `Подставлен type_id из Kaiten: ${data.externalTypeId}.`
          : "Тип добавлен, ID подтянут из Kaiten.";
      if (data.kaitenAmbiguousName) {
        setTypeOkHint(
          `${idHint} В Kaiten несколько типов с таким названием — взят первый в ответе API.`,
        );
      } else {
        setTypeOkHint(idHint);
      }
      await loadTypes();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(KANBAN_KAITEN_CARD_TYPES_SYNCED_EVENT));
      }
    } finally {
      setAddBusy(false);
    }
  }

  async function syncFromKaiten() {
    setSyncNotice(null);
    setTypeMsg(null);
    setTypeOkHint(null);
    setSyncBusy(true);
    try {
      const res = await fetch("/api/kaiten-card-types/sync", { method: "POST" });
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        kaitenTypesCount?: number;
        updated?: Array<{ name: string; oldExternalTypeId: number; newExternalTypeId: number }>;
        unchanged?: string[];
        notFoundInKaiten?: string[];
        ambiguousKaitenNames?: string[];
      };
      if (!res.ok) {
        setSyncNotice({
          tone: "err",
          lines: [j.error ?? "Запрос не выполнен"],
        });
        return;
      }
      await loadTypes();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(KANBAN_KAITEN_CARD_TYPES_SYNCED_EVENT));
      }
      const lines: string[] = [];
      lines.push(
        `В Kaiten получено типов: ${j.kaitenTypesCount ?? "—"}. Обновлено записей в CRM: ${j.updated?.length ?? 0}.`,
      );
      if (j.updated && j.updated.length > 0) {
        lines.push(
          "Изменения: " +
            j.updated
              .map(
                (u) =>
                  `«${u.name}» ${u.oldExternalTypeId} → ${u.newExternalTypeId}`,
              )
              .join("; "),
        );
      }
      if (j.notFoundInKaiten && j.notFoundInKaiten.length > 0) {
        lines.push(
          `В Kaiten не найдено по названию (названия должны совпадать): ${j.notFoundInKaiten.join(", ")}.`,
        );
      }
      if (j.ambiguousKaitenNames && j.ambiguousKaitenNames.length > 0) {
        lines.push(
          `В Kaiten дублируются названия (использован первый в ответе API): ${j.ambiguousKaitenNames.join(", ")}.`,
        );
      }
      setSyncNotice({
        tone:
          j.notFoundInKaiten?.length || j.ambiguousKaitenNames?.length
            ? "warn"
            : "ok",
        lines,
      });
    } catch (e) {
      setSyncNotice({
        tone: "err",
        lines: [e instanceof Error ? e.message : "Сбой сети"],
      });
    } finally {
      setSyncBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {loadError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {loadError}
        </p>
      ) : null}

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--app-text)]">
            Типы карточек в Kaiten
          </h2>
          <button
            type="button"
            disabled={syncBusy}
            onClick={() => void syncFromKaiten()}
            className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm font-medium text-[var(--text-strong)] shadow-sm hover:bg-[var(--table-row-hover)] disabled:opacity-50"
          >
            {syncBusy ? "Обновление…" : "Обновить ID из Kaiten"}
          </button>
        </div>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          «Обновить ID из Kaiten» подтягивает type_id для уже заведённых строк. При
          добавлении нового типа CRM сам запрашивает GET /card-types и ищет совпадение
          по названию (без учёта регистра и лишних пробелов).
        </p>
        {syncNotice ? (
          <div
            className={`mt-2 rounded-md border px-3 py-2 text-sm ${
              syncNotice.tone === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-950/35 dark:text-emerald-100"
                : syncNotice.tone === "warn"
                  ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/35 dark:text-amber-100"
                  : "border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100"
            }`}
          >
            {syncNotice.lines.map((line, i) => (
              <p key={i} className={i > 0 ? "mt-1.5" : ""}>
                {line}
              </p>
            ))}
          </div>
        ) : null}
        {typeMsg ? (
          <p className="mt-2 text-sm text-red-600">{typeMsg}</p>
        ) : null}
        {typeOkHint ? (
          <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-300">{typeOkHint}</p>
        ) : null}
        <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--card-border)]">
          <table className="min-w-[640px] w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
                <th className="px-3 py-2">Название</th>
                <th className="px-3 py-2">ID типа в Kaiten</th>
                <th className="px-3 py-2">Порядок</th>
                <th className="px-3 py-2">Активен</th>
                <th className="px-3 py-2">CRM</th>
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.id} className="border-b border-[var(--border-subtle)]">
                  <td className="px-3 py-2 font-medium text-[var(--app-text)]">
                    {t.name}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-[var(--text-strong)]">
                    {t.externalTypeId}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-[var(--text-secondary)]">
                    {t.sortOrder}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)]">
                    {t.isActive ? "Да" : "Нет"}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-50 dark:border-red-900/50 dark:text-red-200 dark:hover:bg-red-950/40"
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Удалить тип «${t.name}» только из CRM?\n\nВ Kaiten тип не удаляется. У нарядов с этим типом поле типа карточки будет очищено.`,
                          )
                        ) {
                          return;
                        }
                        void (async () => {
                          setTypeMsg(null);
                          const res = await fetch(
                            `/api/kaiten-card-types/${encodeURIComponent(t.id)}`,
                            { method: "DELETE", credentials: "include" },
                          );
                          const j = (await res.json().catch(() => ({}))) as {
                            error?: string;
                          };
                          if (!res.ok) {
                            setTypeMsg(j.error ?? "Не удалось удалить");
                            return;
                          }
                          await loadTypes();
                          if (typeof window !== "undefined") {
                            window.dispatchEvent(
                              new CustomEvent(KANBAN_KAITEN_CARD_TYPES_SYNCED_EVENT),
                            );
                          }
                        })();
                      }}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form
          onSubmit={addType}
          className="mt-4 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-[var(--input-border)] p-3"
        >
          <label className="text-sm">
            <span className="text-xs text-[var(--text-muted)]">
              Название (как в Kaiten)
            </span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Как в списке типов Kaiten"
              className="mt-0.5 block h-8 min-w-[12rem] rounded border border-[var(--input-border)] px-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-xs text-[var(--text-muted)]">Порядок</span>
            <input
              value={newSort}
              onChange={(e) => setNewSort(e.target.value)}
              className="mt-0.5 block h-8 w-16 rounded border border-[var(--input-border)] px-2"
            />
          </label>
          <button
            type="submit"
            disabled={addBusy}
            className="h-8 rounded-md bg-zinc-800 px-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {addBusy ? "Запрос к Kaiten…" : "Добавить тип"}
          </button>
        </form>
      </section>
    </div>
  );
}
