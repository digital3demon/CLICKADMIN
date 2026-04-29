"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PriceListTabbedBody } from "@/components/price-list/PriceListTabbedBody";

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

type PriceListsPayload = {
  activePriceListId: string;
  lists: ListRow[];
  error?: string;
};

export function PriceListDirectoryClient() {
  const [lists, setLists] = useState<ListRow[]>([]);
  const [activePriceListId, setActivePriceListId] = useState<string | null>(null);
  const [editListId, setEditListId] = useState<string | null>(null);

  const [items, setItems] = useState<Row[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [priceRub, setPriceRub] = useState("");
  const [lead, setLead] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [listSearch, setListSearch] = useState("");

  const [newListName, setNewListName] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [createListErr, setCreateListErr] = useState<string | null>(null);
  const [settingActive, setSettingActive] = useState(false);

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
    } catch {
      setLoadError("Сеть недоступна");
    } finally {
      setSettingActive(false);
    }
  }

  const editListLabel =
    lists.find((l) => l.id === editListId)?.name ?? "—";

  return (
    <div className="space-y-8">
      {loadError ? (
        <p className="text-sm text-amber-800">{loadError}</p>
      ) : null}

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
        <h2 className="text-lg font-semibold text-[var(--app-text)]">
          Добавить позицию
          {editListId ? (
            <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">
              в «{editListLabel}»
            </span>
          ) : null}
        </h2>
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
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
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

      <section>
        <h2 className="text-lg font-semibold text-[var(--app-text)]">
          Позиции каталога «{editListLabel}»
        </h2>
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
            ) : (
              <PriceListTabbedBody items={filteredForTabs} />
            )}
          </div>
        )}
      </section>
    </div>
  );
}
