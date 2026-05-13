"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PriceListTabbedBody } from "@/components/price-list/PriceListTabbedBody";
import { PriceOverridesManager } from "@/components/directory/PriceOverridesManager";

type Row = {
  id: string;
  code: string;
  name: string;
  sectionTitle: string | null;
  subsectionTitle: string | null;
  priceRub: number;
  leadWorkingDays: number | null;
  description: string | null;
};

type ListRow = { id: string; name: string; sortOrder: number; itemCount: number };

type EditDraft = {
  code: string;
  name: string;
  sectionTitle: string;
  subsectionTitle: string;
  description: string;
  priceRub: string;
  leadWorkingDays: string;
};

type PriceListsPayload = {
  activePriceListId: string;
  lists: ListRow[];
  error?: string;
};

function draftFromRow(row: Row): EditDraft {
  return {
    code: row.code,
    name: row.name,
    sectionTitle: row.sectionTitle ?? "",
    subsectionTitle: row.subsectionTitle ?? "",
    description: row.description ?? "",
    priceRub: String(row.priceRub),
    leadWorkingDays:
      row.leadWorkingDays == null ? "" : String(row.leadWorkingDays),
  };
}

function normalizeIntText(value: string): number | null {
  const text = value.replace(/\s/g, "").trim();
  if (!text) return null;
  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
}

function draftChanged(row: Row, draft: EditDraft): boolean {
  return (
    draft.code.trim() !== row.code ||
    draft.name.trim() !== row.name ||
    draft.sectionTitle.trim() !== (row.sectionTitle ?? "") ||
    draft.subsectionTitle.trim() !== (row.subsectionTitle ?? "") ||
    draft.description.trim() !== (row.description ?? "") ||
    (normalizeIntText(draft.priceRub) ?? 0) !== row.priceRub ||
    normalizeIntText(draft.leadWorkingDays) !== row.leadWorkingDays
  );
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.map((v) => String(v ?? "").trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "ru"));
}

function AutoGrowTextarea({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, []);

  useLayoutEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      placeholder={placeholder}
      onChange={(e) => {
        onChange(e.target.value);
        requestAnimationFrame(resize);
      }}
      className={[
        "min-h-9 resize-none overflow-y-auto leading-snug",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

export function PriceListDirectoryClient() {
  const [lists, setLists] = useState<ListRow[]>([]);
  const [activePriceListId, setActivePriceListId] = useState<string | null>(null);
  const [editListId, setEditListId] = useState<string | null>(null);

  const [items, setItems] = useState<Row[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [sectionTitle, setSectionTitle] = useState("");
  const [subsectionTitle, setSubsectionTitle] = useState("");
  const [priceRub, setPriceRub] = useState("");
  const [lead, setLead] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [listSearch, setListSearch] = useState("");
  const positionsSectionRef = useRef<HTMLElement | null>(null);

  const [newListName, setNewListName] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [createListErr, setCreateListErr] = useState<string | null>(null);
  const [settingActive, setSettingActive] = useState(false);
  const [canCorrectActivePrice, setCanCorrectActivePrice] = useState(false);
  const [correctionMode, setCorrectionMode] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, EditDraft>>({});
  const [correctionBusyId, setCorrectionBusyId] = useState<string | null>(null);
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  const refreshCatalogsAndItems = useCallback(
    async (preferredEditId: string | null) => {
      setLoadError(null);
      try {
        const mr = await fetch("/api/price-lists");
        const m = (await mr.json()) as PriceListsPayload | { error?: string };
        if (!mr.ok) {
          throw new Error(
            "error" in m && m.error ? String(m.error) : "Ошибка каталогов",
          );
        }
        if (!("lists" in m && "activePriceListId" in m)) {
          throw new Error("Ошибка каталогов");
        }
        const payload = m as PriceListsPayload;
        const listsOk = payload.lists ?? [];
        setLists(listsOk);
        setActivePriceListId(payload.activePriceListId);
        const nextEdit =
          preferredEditId &&
          listsOk.some((l: ListRow) => l.id === preferredEditId)
            ? preferredEditId
            : payload.activePriceListId;
        setEditListId(nextEdit);

        const ir = await fetch(
          `/api/price-list-items?listId=${encodeURIComponent(nextEdit)}`,
        );
        const idata = (await ir.json()) as Row[] | { error?: string };
        if (!ir.ok) {
          throw new Error(
            typeof idata === "object" && idata && "error" in idata
              ? String(idata.error)
              : "Ошибка загрузки позиций",
          );
        }
        setItems(Array.isArray(idata) ? idata : []);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Ошибка");
      }
    },
    [],
  );

  useEffect(() => {
    void refreshCatalogsAndItems(null);
  }, [refreshCatalogsAndItems]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as {
          user?: { moduleAccess?: Record<string, boolean> } | null;
        };
        if (cancelled) return;
        setCanCorrectActivePrice(
          data.user?.moduleAccess?.CONFIG_PRICING_CORRECTION === true,
        );
      } catch {
        if (!cancelled) setCanCorrectActivePrice(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!correctionMode) return;
    setDrafts(Object.fromEntries(items.map((it) => [it.id, draftFromRow(it)])));
  }, [items, correctionMode]);

  const reloadItemsOnly = useCallback(async (listId: string) => {
    try {
      const ir = await fetch(
        `/api/price-list-items?listId=${encodeURIComponent(listId)}`,
      );
      const idata = (await ir.json()) as Row[] | { error?: string };
      if (!ir.ok) {
        throw new Error(
          typeof idata === "object" && idata && "error" in idata
            ? String(idata.error)
            : "Ошибка загрузки позиций",
        );
      }
      setItems(Array.isArray(idata) ? idata : []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Ошибка");
    }
  }, []);

  const onEditListChange = useCallback(
    (id: string) => {
      setEditListId(id);
      setCorrectionMode(false);
      setDrafts({});
      setCorrectionError(null);
      void reloadItemsOnly(id);
    },
    [reloadItemsOnly],
  );

  const filteredForTabs = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.code.toLowerCase().includes(q) ||
        it.name.toLowerCase().includes(q) ||
        (it.sectionTitle?.toLowerCase().includes(q) ?? false) ||
        (it.subsectionTitle?.toLowerCase().includes(q) ?? false) ||
        (it.description?.toLowerCase().includes(q) ?? false),
    );
  }, [items, listSearch]);
  const orderNewItems = useMemo(
    () =>
      items.filter((it) =>
        (it.name ?? "").trim().startsWith('НОВАЯ ПОЗИЦИЯ "'),
      ),
    [items],
  );
  const sectionOptions = useMemo(
    () => uniqueNonEmpty(items.map((it) => it.sectionTitle)),
    [items],
  );
  const subsectionOptions = useMemo(
    () => uniqueNonEmpty(items.map((it) => it.subsectionTitle)),
    [items],
  );

  async function addRow(e: React.FormEvent) {
    e.preventDefault();
    if (!editListId) return;
    setSaveError(null);
    setSaving(true);
    try {
      const p = Number.parseInt(priceRub.replace(/\s/g, ""), 10);
      const res = await fetch("/api/price-list-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceListId: editListId,
          code: code.trim(),
          name: name.trim(),
          sectionTitle: sectionTitle.trim() || null,
          subsectionTitle: subsectionTitle.trim() || null,
          priceRub: Number.isFinite(p) ? p : 0,
          leadWorkingDays:
            lead.trim() === ""
              ? null
              : Number.parseInt(lead, 10),
          description: description.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setSaveError(data.error ?? "Не сохранено");
        return;
      }
      setCode("");
      setName("");
      setSectionTitle("");
      setSubsectionTitle("");
      setPriceRub("");
      setLead("");
      setDescription("");
      await refreshCatalogsAndItems(editListId);
    } catch {
      setSaveError("Сеть недоступна");
    } finally {
      setSaving(false);
    }
  }

  async function createCatalog(e: React.FormEvent) {
    e.preventDefault();
    const nm = newListName.trim();
    if (!nm) return;
    setCreateListErr(null);
    setCreatingList(true);
    try {
      const res = await fetch("/api/price-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nm }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) {
        setCreateListErr(data.error ?? "Не создано");
        return;
      }
      setNewListName("");
      const newId = data.id;
      if (newId) await refreshCatalogsAndItems(newId);
      else await refreshCatalogsAndItems(null);
    } catch {
      setCreateListErr("Сеть недоступна");
    } finally {
      setCreatingList(false);
    }
  }

  async function makeEditListActive() {
    if (!editListId || editListId === activePriceListId) return;
    setSettingActive(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/price-lists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activePriceListId: editListId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setLoadError(data.error ?? "Не удалось сменить прайс");
        return;
      }
      setActivePriceListId(editListId);
      setCorrectionMode(false);
      setDrafts({});
    } catch {
      setLoadError("Сеть недоступна");
    } finally {
      setSettingActive(false);
    }
  }

  function startCorrectionMode() {
    if (!canCorrectActivePrice || editListId !== activePriceListId) return;
    setDrafts(Object.fromEntries(items.map((it) => [it.id, draftFromRow(it)])));
    setCorrectionError(null);
    setCorrectionMode(true);
  }

  function updateDraft(id: string, patch: Partial<EditDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? draftFromRow(items.find((it) => it.id === id)!)), ...patch },
    }));
  }

  async function saveCorrection(row: Row) {
    const draft = drafts[row.id] ?? draftFromRow(row);
    const code = draft.code.trim();
    const name = draft.name.trim();
    const price = normalizeIntText(draft.priceRub);
    if (!code || !name || price == null) {
      setCorrectionError("Укажите код, название и цену");
      return;
    }
    const leadWorkingDays = normalizeIntText(draft.leadWorkingDays);
    const ok = window.confirm(
      `Сохранить изменения позиции «${row.code} · ${row.name}»?`,
    );
    if (!ok) return;
    setCorrectionBusyId(row.id);
    setCorrectionError(null);
    try {
      const res = await fetch(`/api/price-list-items/${encodeURIComponent(row.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          name,
          priceRub: price,
          leadWorkingDays,
          sectionTitle: draft.sectionTitle.trim() || null,
          subsectionTitle: draft.subsectionTitle.trim() || null,
          description: draft.description.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setCorrectionError(data.error ?? "Не удалось сохранить позицию");
        return;
      }
      if (editListId) await reloadItemsOnly(editListId);
    } catch {
      setCorrectionError("Сеть недоступна");
    } finally {
      setCorrectionBusyId(null);
    }
  }

  async function deleteCorrection(row: Row) {
    const ok = window.confirm(
      `Удалить позицию «${row.code} · ${row.name}» из актуального прайса? Это физическое удаление из БД.`,
    );
    if (!ok) return;
    setCorrectionBusyId(row.id);
    setCorrectionError(null);
    try {
      const res = await fetch(`/api/price-list-items/${encodeURIComponent(row.id)}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setCorrectionError(data.error ?? "Не удалось удалить позицию");
        return;
      }
      await refreshCatalogsAndItems(editListId);
    } catch {
      setCorrectionError("Сеть недоступна");
    } finally {
      setCorrectionBusyId(null);
    }
  }

  const editListLabel =
    lists.find((l) => l.id === editListId)?.name ?? "—";
  const isActiveEditList = Boolean(
    editListId && activePriceListId && editListId === activePriceListId,
  );
  const canOpenCorrection = canCorrectActivePrice && isActiveEditList;

  return (
    <div className="space-y-8">
      {loadError ? (
        <p className="text-sm text-amber-800">{loadError}</p>
      ) : null}
      <datalist id="price-section-options">
        {sectionOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <datalist id="price-subsection-options">
        {subsectionOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

      <section className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-4">
        <h2 className="text-lg font-semibold text-[var(--app-text)]">Каталоги прайса</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          В нарядах и быстром заказе подставляется{" "}
          <span className="font-medium text-[var(--app-text)]">активный</span> каталог.
          Ниже можно редактировать любой каталог и переключить активный.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="min-w-[12rem] flex-1 text-sm">
            <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
              Редактировать каталог
            </span>
            <select
              className="mt-1 h-9 w-full rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-2 text-sm"
              value={editListId ?? ""}
              onChange={(e) => onEditListChange(e.target.value)}
            >
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                  {l.id === activePriceListId ? " (в нарядах)" : ""}
                  {" · "}
                  {l.itemCount} поз.
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={
              settingActive ||
              !editListId ||
              !activePriceListId ||
              editListId === activePriceListId
            }
            onClick={() => void makeEditListActive()}
            className="h-9 shrink-0 rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 text-sm font-medium text-[var(--text-strong)] shadow-sm hover:bg-[var(--table-row-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {settingActive ? "Сохранение…" : "Использовать в нарядах"}
          </button>
          {canCorrectActivePrice ? (
            <button
              type="button"
              disabled={!canOpenCorrection}
              onClick={correctionMode ? () => setCorrectionMode(false) : startCorrectionMode}
              title={
                canOpenCorrection
                  ? "Изменить актуальный прайс"
                  : "Корректировать можно только выбранный актуальный прайс"
              }
              className="h-9 shrink-0 rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 text-sm font-medium text-[var(--text-strong)] shadow-sm hover:bg-[var(--table-row-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {correctionMode ? "Закрыть изменение" : "Изменить"}
            </button>
          ) : null}
          <PriceOverridesManager />
        </div>

        <form
          onSubmit={createCatalog}
          className="mt-4 flex flex-col gap-2 border-t border-[var(--card-border)] pt-4 sm:flex-row sm:items-end"
        >
          <label className="min-w-[12rem] flex-1 text-sm">
            <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
              Новый каталог
            </span>
            <input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Например: Прайс 2026"
              className="mt-1 h-9 w-full rounded border border-[var(--input-border)] px-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={creatingList || !newListName.trim()}
            className="h-9 w-fit rounded-md bg-[var(--sidebar-blue)] px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {creatingList ? "Создание…" : "Создать каталог"}
          </button>
        </form>
        {createListErr ? (
          <p className="mt-2 text-sm text-red-600">{createListErr}</p>
        ) : null}
      </section>

      <section>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--app-text)]">
            Добавить позицию
            {editListId ? (
              <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">
                в «{editListLabel}»
              </span>
            ) : null}
          </h2>
          {orderNewItems.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {orderNewItems.slice(0, 6).map((it) => (
                <button
                  key={it.id}
                  type="button"
                  className="flex min-h-[3rem] max-w-[17rem] items-center gap-2 rounded-lg border-2 border-dashed border-[var(--card-border)] bg-[var(--surface-subtle)]/40 px-3 py-2 text-left text-xs text-[var(--text-strong)] transition-colors hover:border-[var(--sidebar-blue)] hover:bg-[var(--card-bg)]"
                  title="Показать позицию в списке ниже"
                  onClick={() => {
                    setListSearch(it.name);
                    positionsSectionRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }}
                >
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current">
                    +
                  </span>
                  <span className="truncate">{it.name}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <form
          onSubmit={addRow}
          className="mt-3 grid max-w-xl gap-3 rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                Код
              </span>
              <input
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 h-9 w-full rounded border border-[var(--input-border)] px-2 text-sm"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                Наименование
              </span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 h-9 w-full rounded border border-[var(--input-border)] px-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                Раздел
              </span>
              <input
                list="price-section-options"
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
                placeholder="Например: Основные"
                className="mt-1 h-9 w-full rounded border border-[var(--input-border)] px-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                Подраздел
              </span>
              <input
                list="price-subsection-options"
                value={subsectionTitle}
                onChange={(e) => setSubsectionTitle(e.target.value)}
                placeholder="Можно пусто"
                className="mt-1 h-9 w-full rounded border border-[var(--input-border)] px-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                Цена, ₽
              </span>
              <input
                required
                inputMode="numeric"
                value={priceRub}
                onChange={(e) => setPriceRub(e.target.value)}
                className="mt-1 h-9 w-full rounded border border-[var(--input-border)] px-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                Срок, р.д.
              </span>
              <input
                inputMode="numeric"
                value={lead}
                onChange={(e) => setLead(e.target.value)}
                placeholder="пусто — нет"
                className="mt-1 h-9 w-full rounded border border-[var(--input-border)] px-2 text-sm"
              />
            </label>
          </div>
          <label className="text-sm">
            <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
              Описание
            </span>
            <AutoGrowTextarea
              value={description}
              onChange={setDescription}
              className="mt-1 w-full rounded border border-[var(--input-border)] px-2 py-1.5 text-sm"
            />
          </label>
          {saveError ? (
            <p className="text-sm text-red-600">{saveError}</p>
          ) : null}
          <button
            type="submit"
            disabled={saving || !editListId}
            className="h-9 w-fit rounded-md bg-[var(--sidebar-blue)] px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Сохранение…" : "Добавить"}
          </button>
        </form>
      </section>

      <section ref={positionsSectionRef}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--app-text)]">
            Позиции каталога «{editListLabel}»
          </h2>
          {correctionMode ? (
            <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
              Режим изменения актуального прайса
            </span>
          ) : null}
        </div>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-secondary)]">Нет активных позиций.</p>
        ) : (
          <div className="mt-3 flex min-h-[50vh] flex-col rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <input
              type="search"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder="Поиск по коду, названию, разделу…"
              className="mb-3 rounded-md border border-[var(--input-border)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
            />
            {filteredForTabs.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">Ничего не найдено</p>
            ) : correctionMode ? (
              <div className="min-w-0 overflow-x-auto">
                {correctionError ? (
                  <p className="mb-3 text-sm text-red-600">{correctionError}</p>
                ) : null}
                <table className="min-w-[1180px] w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[var(--card-border)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                      <th className="px-2 py-2">Код</th>
                      <th className="px-2 py-2">Название</th>
                      <th className="px-2 py-2">Раздел</th>
                      <th className="px-2 py-2">Описание</th>
                      <th className="px-2 py-2">Цена</th>
                      <th className="px-2 py-2">Срок</th>
                      <th className="px-2 py-2">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredForTabs.map((row) => {
                      const draft = drafts[row.id] ?? draftFromRow(row);
                      const changed = draftChanged(row, draft);
                      const busy = correctionBusyId === row.id;
                      return (
                        <tr
                          key={row.id}
                          className="border-b border-[var(--card-border)] align-top last:border-b-0"
                        >
                          <td className="px-2 py-2">
                            <input
                              value={draft.code}
                              onChange={(e) =>
                                updateDraft(row.id, { code: e.target.value })
                              }
                              className="h-9 w-28 rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-2 text-sm"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              value={draft.name}
                              onChange={(e) =>
                                updateDraft(row.id, { name: e.target.value })
                              }
                              className="h-9 min-w-[14rem] w-full rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-2 text-sm"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <div className="grid min-w-[13rem] gap-1.5">
                              <input
                                list="price-section-options"
                                value={draft.sectionTitle}
                                onChange={(e) =>
                                  updateDraft(row.id, {
                                    sectionTitle: e.target.value,
                                  })
                                }
                                placeholder="Без раздела"
                                className="h-9 w-full rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-2 text-sm"
                              />
                              <input
                                list="price-subsection-options"
                                value={draft.subsectionTitle}
                                onChange={(e) =>
                                  updateDraft(row.id, {
                                    subsectionTitle: e.target.value,
                                  })
                                }
                                placeholder="Подраздел"
                                className="h-8 w-full rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-2 text-xs"
                              />
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <AutoGrowTextarea
                              value={draft.description}
                              onChange={(value) =>
                                updateDraft(row.id, {
                                  description: value,
                                })
                              }
                              className="min-w-[16rem] w-full rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              inputMode="numeric"
                              value={draft.priceRub}
                              onChange={(e) =>
                                updateDraft(row.id, { priceRub: e.target.value })
                              }
                              className="h-9 w-28 rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-2 text-sm"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              inputMode="numeric"
                              value={draft.leadWorkingDays}
                              onChange={(e) =>
                                updateDraft(row.id, {
                                  leadWorkingDays: e.target.value,
                                })
                              }
                              placeholder="нет"
                              className="h-9 w-24 rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-2 text-sm"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex flex-col gap-2">
                              <button
                                type="button"
                                disabled={!changed || busy || correctionBusyId != null}
                                onClick={() => void saveCorrection(row)}
                                className="rounded-md bg-[var(--sidebar-blue)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                              >
                                {busy ? "Сохранение…" : "Сохранить"}
                              </button>
                              <button
                                type="button"
                                disabled={busy || correctionBusyId != null}
                                onClick={() => void deleteCorrection(row)}
                                className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/70 dark:text-red-300 dark:hover:bg-red-950/30"
                              >
                                Удалить
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <PriceListTabbedBody items={filteredForTabs} />
            )}
          </div>
        )}
      </section>
    </div>
  );
}
