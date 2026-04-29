"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type WarehouseRow = {
  id: string;
  name: string;
  warehouseType: string | null;
  isDefault: boolean;
  isActive: boolean;
  notes: string | null;
  _count: { movements: number };
};

type InvItem = {
  id: string;
  warehouseId: string;
  warehouse: { id: string; name: string };
  sku: string | null;
  name: string;
  unit: string;
  manufacturer: string | null;
  unitsPerSupply: number | null;
  referenceUnitPriceRub: number | null;
  notes: string | null;
  isActive: boolean;
  quantityOnHand: number;
  averageUnitCostRub: number | null;
};

function formatNum(n: number, frac = 2): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: frac,
  });
}

export function DirectoryWarehouseSettingsClient() {
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [items, setItems] = useState<InvItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [bannerOk, setBannerOk] = useState(false);

  const [whName, setWhName] = useState("");
  const [whWarehouseType, setWhWarehouseType] = useState("");
  const [whNotes, setWhNotes] = useState("");
  const [whDefault, setWhDefault] = useState(false);
  const [whError, setWhError] = useState<string | null>(null);

  const [itWarehouseId, setItWarehouseId] = useState("");
  const [itName, setItName] = useState("");
  const [itManufacturer, setItManufacturer] = useState("");
  const [itSku, setItSku] = useState("");
  const [itUnit, setItUnit] = useState("шт");
  const [itUnitsPerSupply, setItUnitsPerSupply] = useState("");
  const [itReferencePrice, setItReferencePrice] = useState("");
  const [itNotes, setItNotes] = useState("");
  const [itError, setItError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      const [wRes, iRes] = await Promise.all([
        fetch("/api/inventory/warehouses?all=1"),
        fetch("/api/inventory/items"),
      ]);
      if (!wRes.ok) throw new Error("Склады");
      if (!iRes.ok) throw new Error("Позиции");
      setWarehouses((await wRes.json()) as WarehouseRow[]);
      setItems((await iRes.json()) as InvItem[]);
    } catch {
      setLoadError(
        "Не удалось загрузить данные. Выполните миграции Prisma (migrate deploy) и generate.",
      );
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const def = warehouses.find((w) => w.isActive && w.isDefault)?.id;
    const first = warehouses.find((w) => w.isActive)?.id;
    const pick = def ?? first ?? "";
    if (!pick) return;
    setItWarehouseId((prev) => (prev.trim() ? prev : pick));
  }, [warehouses]);

  const showBanner = (text: string, ok: boolean) => {
    setBanner(text);
    setBannerOk(ok);
  };

  const submitWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setWhError(null);
    const name = whName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const res = await fetch("/api/inventory/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          warehouseType: whWarehouseType.trim() || null,
          notes: whNotes.trim() || null,
          isDefault: whDefault,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setWhError(data.error ?? "Ошибка");
        return;
      }
      setWhName("");
      setWhWarehouseType("");
      setWhNotes("");
      setWhDefault(false);
      showBanner("Склад создан", true);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const patchWarehouse = async (
    id: string,
    patch: Record<string, unknown>,
    opts?: { quiet?: boolean },
  ) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/inventory/warehouses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        showBanner(data.error ?? "Ошибка", false);
        return;
      }
      if (!opts?.quiet) showBanner("Сохранено", true);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const submitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setItError(null);
    const name = itName.trim();
    if (!name) return;
    if (!itWarehouseId.trim()) {
      setItError("Выберите склад");
      return;
    }
    setBusy(true);
    try {
      const supplyRaw = itUnitsPerSupply.trim().replace(",", ".");
      const supply =
        supplyRaw === "" ? null : Number.parseFloat(supplyRaw);
      if (supplyRaw !== "" && (!Number.isFinite(supply!) || supply! <= 0)) {
        setItError("Поставка: укажите число больше нуля или оставьте пусто");
        setBusy(false);
        return;
      }
      const priceRaw = itReferencePrice.trim().replace(",", ".");
      const price =
        priceRaw === "" ? null : Number.parseFloat(priceRaw);
      if (priceRaw !== "" && !Number.isFinite(price!)) {
        setItError("Цена за ед.: некорректное число");
        setBusy(false);
        return;
      }
      const res = await fetch("/api/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: itWarehouseId.trim(),
          name,
          manufacturer: itManufacturer.trim() || null,
          sku: itSku.trim() || null,
          unit: itUnit.trim() || "шт",
          unitsPerSupply: supply,
          referenceUnitPriceRub: price,
          notes: itNotes.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setItError(data.error ?? "Ошибка");
        return;
      }
      setItName("");
      setItManufacturer("");
      setItSku("");
      setItUnit("шт");
      setItUnitsPerSupply("");
      setItReferencePrice("");
      setItNotes("");
      showBanner("Позиция добавлена", true);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const patchItem = async (id: string, patch: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/inventory/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        showBanner(data.error ?? "Ошибка", false);
        return;
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const deactivateItem = (id: string) => {
    if (!confirm("Снять позицию с учёта? В операциях склада она не будет выбираться.")) {
      return;
    }
    void patchItem(id, { isActive: false });
  };

  const deactivateWarehouse = (id: string, name: string) => {
    if (
      !confirm(
        `Скрыть склад «${name}»? Остатки и история сохранятся; склад не будет доступен в новых операциях.`,
      )
    ) {
      return;
    }
    void patchWarehouse(id, { isActive: false });
  };

  const deleteWarehouse = async (id: string, name: string) => {
    if (
      !confirm(
        `Удалить склад «${name}» безвозвратно?\n\nДоступно только если по складу не было движений и нет позиций. Если движения были — используйте «Скрыть».`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/inventory/warehouses/${id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        showBanner(data.error ?? "Не удалось удалить", false);
        return;
      }
      showBanner(`Склад «${name}» удалён`, true);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const activeWarehouses = warehouses.filter((w) => w.isActive);

  return (
    <div className="space-y-10">
      <p className="text-sm text-[var(--text-secondary)]">
        <Link
          href="/directory"
          className="font-medium text-[var(--sidebar-blue)] hover:underline"
        >
          ← Конфигурация
        </Link>
        {" · "}
        <Link
          href="/warehouse"
          className="font-medium text-[var(--sidebar-blue)] hover:underline"
        >
          Операции на складе
        </Link>
      </p>

      {loadError ? (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="alert"
        >
          {loadError}
        </div>
      ) : null}

      {banner ? (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            bannerOk
              ? "border border-emerald-200 bg-emerald-50 text-emerald-950"
              : "border border-red-200 bg-red-50 text-red-900"
          }`}
          role="status"
        >
          {banner}
        </div>
      ) : null}

      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-6">
        <h2 className="text-base font-semibold text-[var(--app-text)]">Склады</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Название и тип склада. Один склад можно отметить как основной. Полное
          удаление — только без движений и без позиций; иначе «Скрыть».
        </p>

        <form
          className="mt-4 grid grid-cols-1 gap-3 border-t border-[var(--border-subtle)] pt-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={submitWarehouse}
        >
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-secondary)] sm:col-span-2">
            Название
            <input
              className="rounded-md border border-[var(--input-border)] px-2 py-2 text-sm"
              value={whName}
              onChange={(e) => setWhName(e.target.value)}
              placeholder="Напр. Основной склад"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-secondary)] sm:col-span-2">
            Тип
            <input
              className="rounded-md border border-[var(--input-border)] px-2 py-2 text-sm"
              value={whWarehouseType}
              onChange={(e) => setWhWarehouseType(e.target.value)}
              placeholder="Напр. Материалы, Магазин Ozon"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-secondary)] sm:col-span-2 lg:col-span-4">
            Примечание
            <input
              className="rounded-md border border-[var(--input-border)] px-2 py-2 text-sm"
              value={whNotes}
              onChange={(e) => setWhNotes(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--text-body)] sm:col-span-2 lg:col-span-4">
            <input
              type="checkbox"
              checked={whDefault}
              onChange={(e) => setWhDefault(e.target.checked)}
            />
            Сделать складом по умолчанию
          </label>
          {whError ? (
            <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-4">
              {whError}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy || !whName.trim()}
            className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50 sm:col-span-2 lg:col-span-1"
          >
            Добавить склад
          </button>
        </form>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                <th className="py-2 pr-3 font-medium">Название</th>
                <th className="py-2 pr-3 font-medium">Тип</th>
                <th className="py-2 pr-3 font-medium">Статус</th>
                <th className="py-2 pr-3 font-medium text-right">Движений</th>
                <th className="py-2 pr-3 font-medium">Примечание</th>
                <th className="py-2 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {warehouses.map((w) => (
                <tr key={w.id} className="border-b border-[var(--border-subtle)]">
                  <td className="py-2 pr-3 font-medium text-[var(--app-text)]">
                    {w.name}
                    {w.isDefault ? (
                      <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-800">
                        по умолчанию
                      </span>
                    ) : null}
                  </td>
                  <td className="max-w-[200px] py-2 pr-3">
                    <input
                      className="w-full min-w-0 rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-1.5 py-1 text-xs"
                      defaultValue={w.warehouseType ?? ""}
                      disabled={busy || !w.isActive}
                      title="Сохраняется при уходе с поля"
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        const prev = (w.warehouseType ?? "").trim();
                        if (v === prev) return;
                        void patchWarehouse(
                          w.id,
                          { warehouseType: v.length ? v : null },
                          { quiet: true },
                        );
                      }}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    {w.isActive ? (
                      <span className="text-emerald-700">Активен</span>
                    ) : (
                      <span className="text-[var(--text-muted)]">Скрыт</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-[var(--text-body)]">
                    {w._count.movements}
                  </td>
                  <td className="max-w-[220px] truncate py-2 pr-3 text-[var(--text-secondary)]">
                    {w.notes ?? "—"}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      {w.isActive && !w.isDefault ? (
                        <button
                          type="button"
                          disabled={busy}
                          className="text-xs font-semibold uppercase text-[var(--sidebar-blue)] underline hover:no-underline disabled:opacity-50"
                          onClick={() =>
                            void patchWarehouse(w.id, { isDefault: true })
                          }
                        >
                          Основной
                        </button>
                      ) : null}
                      {w.isActive ? (
                        <button
                          type="button"
                          disabled={busy}
                          className="text-xs font-semibold uppercase text-[var(--text-muted)] underline hover:text-[var(--text-strong)] disabled:opacity-50"
                          onClick={() => void deactivateWarehouse(w.id, w.name)}
                        >
                          Скрыть
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          className="text-xs font-semibold uppercase text-emerald-700 underline disabled:opacity-50"
                          onClick={() =>
                            void patchWarehouse(w.id, { isActive: true })
                          }
                        >
                          Включить
                        </button>
                      )}
                      {w._count.movements === 0 ? (
                        <button
                          type="button"
                          disabled={busy}
                          className="text-xs font-semibold uppercase text-red-600 underline hover:text-red-800 disabled:opacity-50"
                          onClick={() => void deleteWarehouse(w.id, w.name)}
                        >
                          Удалить
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-6">
        <h2 className="text-base font-semibold text-[var(--app-text)]">
          Складские позиции
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Позиция привязана к одному складу. <strong>Поставка</strong> — сколько
          единиц учёта в одной упаковке (например 10 шт в коробке): на странице
          «Склад» можно списывать и поштучно, и поставками; цена закупки всегда
          указывается за единицу учёта.
        </p>

        <form
          className="mt-4 grid grid-cols-1 gap-3 border-t border-[var(--border-subtle)] pt-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          onSubmit={submitItem}
        >
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-secondary)] sm:col-span-2 lg:col-span-1">
            Склад
            <select
              className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-2 text-sm"
              value={itWarehouseId}
              onChange={(e) => setItWarehouseId(e.target.value)}
              required
            >
              <option value="">— выберите —</option>
              {activeWarehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-secondary)] sm:col-span-2 lg:col-span-1">
            Наименование
            <input
              className="rounded-md border border-[var(--input-border)] px-2 py-2 text-sm"
              value={itName}
              onChange={(e) => setItName(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-secondary)]">
            Производитель
            <input
              className="rounded-md border border-[var(--input-border)] px-2 py-2 text-sm"
              value={itManufacturer}
              onChange={(e) => setItManufacturer(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-secondary)]">
            Артикул
            <input
              className="rounded-md border border-[var(--input-border)] px-2 py-2 text-sm"
              value={itSku}
              onChange={(e) => setItSku(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-secondary)]">
            Ед. учёта
            <input
              className="rounded-md border border-[var(--input-border)] px-2 py-2 text-sm"
              value={itUnit}
              onChange={(e) => setItUnit(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-secondary)]">
            Поставка (шт в упак.)
            <input
              className="rounded-md border border-[var(--input-border)] px-2 py-2 text-sm"
              value={itUnitsPerSupply}
              onChange={(e) => setItUnitsPerSupply(e.target.value)}
              placeholder="Напр. 10"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-secondary)]">
            Цена за ед., ₽ (справочно)
            <input
              className="rounded-md border border-[var(--input-border)] px-2 py-2 text-sm"
              value={itReferencePrice}
              onChange={(e) => setItReferencePrice(e.target.value)}
              placeholder="Опционально"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-secondary)] sm:col-span-2 xl:col-span-4">
            Примечание (магазин, поставщик…)
            <input
              className="rounded-md border border-[var(--input-border)] px-2 py-2 text-sm"
              value={itNotes}
              onChange={(e) => setItNotes(e.target.value)}
            />
          </label>
          {itError ? (
            <p className="text-sm text-red-600 sm:col-span-2 xl:col-span-4">
              {itError}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy || !itName.trim() || !itWarehouseId}
            className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            Добавить позицию
          </button>
        </form>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                <th className="py-2 pr-2 font-medium">Склад</th>
                <th className="py-2 pr-2 font-medium">Производитель</th>
                <th className="py-2 pr-2 font-medium">Артикул</th>
                <th className="py-2 pr-2 font-medium">Наименование</th>
                <th className="py-2 pr-2 font-medium">Ед.</th>
                <th className="py-2 pr-2 font-medium">Поставка</th>
                <th className="py-2 pr-2 font-medium">Цена/ед. ₽</th>
                <th className="py-2 pr-2 font-medium">Остаток</th>
                <th className="py-2 pr-2 font-medium">Сред. закуп. ₽</th>
                <th className="py-2 pr-2 font-medium">Примечание</th>
                <th className="py-2 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr
                  key={it.id}
                  className={`border-b border-[var(--border-subtle)] ${it.isActive ? "" : "bg-[var(--surface-muted)] text-[var(--text-muted)]"}`}
                >
                  <td className="py-2 pr-2 whitespace-nowrap">
                    {it.warehouse.name}
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      className="w-full max-w-[140px] rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-1 py-0.5 text-xs"
                      defaultValue={it.manufacturer ?? ""}
                      disabled={busy}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v === (it.manufacturer ?? "").trim()) return;
                        void patchItem(it.id, { manufacturer: v || null });
                      }}
                    />
                  </td>
                  <td className="py-2 pr-2">{it.sku ?? "—"}</td>
                  <td className="py-2 pr-2 font-medium">{it.name}</td>
                  <td className="py-2 pr-2">{it.unit}</td>
                  <td className="py-2 pr-2">
                    <input
                      className="w-20 rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-1 py-0.5 text-xs tabular-nums"
                      defaultValue={
                        it.unitsPerSupply != null
                          ? String(it.unitsPerSupply)
                          : ""
                      }
                      disabled={busy}
                      onBlur={(e) => {
                        const raw = e.target.value.trim().replace(",", ".");
                        if (raw === "") {
                          if (it.unitsPerSupply != null) {
                            void patchItem(it.id, { unitsPerSupply: null });
                          }
                          return;
                        }
                        const n = Number.parseFloat(raw);
                        if (
                          !Number.isFinite(n) ||
                          n <= 0 ||
                          n === it.unitsPerSupply
                        ) {
                          return;
                        }
                        void patchItem(it.id, { unitsPerSupply: n });
                      }}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      className="w-24 rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-1 py-0.5 text-xs tabular-nums"
                      defaultValue={
                        it.referenceUnitPriceRub != null
                          ? String(it.referenceUnitPriceRub)
                          : ""
                      }
                      disabled={busy}
                      onBlur={(e) => {
                        const raw = e.target.value.trim().replace(",", ".");
                        if (raw === "") {
                          if (it.referenceUnitPriceRub != null) {
                            void patchItem(it.id, {
                              referenceUnitPriceRub: null,
                            });
                          }
                          return;
                        }
                        const n = Number.parseFloat(raw);
                        if (
                          !Number.isFinite(n) ||
                          n === it.referenceUnitPriceRub
                        ) {
                          return;
                        }
                        void patchItem(it.id, { referenceUnitPriceRub: n });
                      }}
                    />
                  </td>
                  <td className="py-2 pr-2 tabular-nums">
                    {formatNum(it.quantityOnHand, 3)}
                  </td>
                  <td className="py-2 pr-2 tabular-nums text-[var(--text-secondary)]">
                    {it.averageUnitCostRub != null
                      ? formatNum(it.averageUnitCostRub, 2)
                      : "—"}
                  </td>
                  <td className="max-w-[160px] py-2 pr-2">
                    <input
                      className="w-full rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-1 py-0.5 text-xs"
                      defaultValue={it.notes ?? ""}
                      disabled={busy}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v === (it.notes ?? "").trim()) return;
                        void patchItem(it.id, { notes: v || null });
                      }}
                    />
                  </td>
                  <td className="py-2">
                    {it.isActive ? (
                      <button
                        type="button"
                        disabled={busy}
                        className="text-xs font-semibold uppercase text-[var(--text-muted)] underline hover:text-[var(--text-strong)] disabled:opacity-50"
                        onClick={() => void deactivateItem(it.id)}
                      >
                        Снять
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        className="text-xs font-semibold uppercase text-emerald-700 underline disabled:opacity-50"
                        onClick={() => void patchItem(it.id, { isActive: true })}
                      >
                        Вернуть
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--text-muted)]">Позиций пока нет.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
