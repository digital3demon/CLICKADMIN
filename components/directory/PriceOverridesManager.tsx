"use client";

import { useEffect, useMemo, useState } from "react";

type TargetType = "CLINIC" | "DOCTOR" | "DOCTOR_CLINIC";

type TargetRow = { id: string; name: string };
type ItemRow = {
  id: string;
  code: string;
  name: string;
  sectionTitle?: string | null;
  subsectionTitle?: string | null;
  priceRub: number;
};

type OverrideRow = {
  priceListItemId: string;
  code: string;
  name: string;
  basePriceRub: number;
  individualPriceRub: number;
};

function normalizeRub(v: unknown): number {
  return Math.max(0, Math.round(Number(v) || 0));
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function discountValue(base: number, individual: number): number {
  if (base <= 0) return 0;
  return round1(((base - individual) / base) * 100);
}

function priceByDiscount(base: number, discountPercent: number): number {
  return normalizeRub(base * (1 - discountPercent / 100));
}

function targetTypeLabel(v: TargetType): string {
  if (v === "CLINIC") return "Клиника";
  if (v === "DOCTOR") return "Доктор";
  return "Доктор + клиника";
}

export function PriceOverridesManager() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okText, setOkText] = useState<string | null>(null);

  const [targetType, setTargetType] = useState<TargetType>("CLINIC");
  const [clinics, setClinics] = useState<TargetRow[]>([]);
  const [doctors, setDoctors] = useState<TargetRow[]>([]);
  const [clinicSearch, setClinicSearch] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [clinicId, setClinicId] = useState("");
  const [doctorId, setDoctorId] = useState("");

  const [items, setItems] = useState<ItemRow[]>([]);
  const [rows, setRows] = useState<OverrideRow[]>([]);
  const [pickSearch, setPickSearch] = useState("");
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const [blockKey, setBlockKey] = useState("");

  const targetReady =
    targetType === "CLINIC"
      ? Boolean(clinicId)
      : targetType === "DOCTOR"
        ? Boolean(doctorId)
        : Boolean(clinicId && doctorId);
  const selectedTargetName = useMemo(() => {
    if (!targetReady) return "Не выбран";
    if (targetType === "CLINIC") {
      return clinics.find((c) => c.id === clinicId)?.name ?? "Клиника";
    }
    if (targetType === "DOCTOR") {
      return doctors.find((d) => d.id === doctorId)?.name ?? "Доктор";
    }
    const c = clinics.find((x) => x.id === clinicId)?.name ?? "Клиника";
    const d = doctors.find((x) => x.id === doctorId)?.name ?? "Доктор";
    return `${d} / ${c}`;
  }, [targetReady, targetType, clinics, doctors, clinicId, doctorId]);

  const filteredClinics = useMemo(() => {
    const q = clinicSearch.trim().toLowerCase();
    if (!q) return clinics;
    return clinics.filter((x) => x.name.toLowerCase().includes(q));
  }, [clinicSearch, clinics]);

  const filteredDoctors = useMemo(() => {
    const q = doctorSearch.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter((x) => x.name.toLowerCase().includes(q));
  }, [doctorSearch, doctors]);

  const rowIdSet = useMemo(
    () => new Set(rows.map((x) => x.priceListItemId)),
    [rows],
  );

  const pickFiltered = useMemo(() => {
    const q = pickSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.code.toLowerCase().includes(q) ||
        it.name.toLowerCase().includes(q) ||
        (it.sectionTitle?.toLowerCase().includes(q) ?? false) ||
        (it.subsectionTitle?.toLowerCase().includes(q) ?? false),
    );
  }, [pickSearch, items]);

  const blockOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of items) {
      const sec = (it.sectionTitle ?? "").trim();
      const sub = (it.subsectionTitle ?? "").trim();
      if (sec && sub) {
        m.set(`${sec}:::${sub}`, `${sec} / ${sub}`);
      } else if (sec) {
        m.set(`${sec}:::`, sec);
      }
    }
    return [...m.entries()].map(([id, label]) => ({ id, label }));
  }, [items]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setOkText(null);
      try {
        const [targetsRes, itemsRes] = await Promise.all([
          fetch("/api/price-overrides/targets", { cache: "no-store" }),
          fetch("/api/price-list-items", { cache: "no-store" }),
        ]);
        const targetsData = (await targetsRes.json().catch(() => ({}))) as {
          error?: string;
          clinics?: TargetRow[];
          doctors?: TargetRow[];
        };
        const itemsData = (await itemsRes.json().catch(() => [])) as ItemRow[];
        if (!targetsRes.ok) {
          throw new Error(targetsData.error ?? "Не удалось загрузить контрагентов");
        }
        if (!itemsRes.ok) {
          throw new Error("Не удалось загрузить позиции прайса");
        }
        if (cancelled) return;
        setClinics(Array.isArray(targetsData.clinics) ? targetsData.clinics : []);
        setDoctors(Array.isArray(targetsData.doctors) ? targetsData.doctors : []);
        setItems(Array.isArray(itemsData) ? itemsData : []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Ошибка загрузки");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !targetReady) {
      setRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setOkText(null);
      try {
        const q = new URLSearchParams({
          targetType,
          ...(clinicId ? { clinicId } : {}),
          ...(doctorId ? { doctorId } : {}),
        });
        const res = await fetch(`/api/price-overrides?${q.toString()}`, {
          cache: "no-store",
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          overrides?: { priceListItemId: string; priceRub: number }[];
        };
        if (!res.ok) {
          throw new Error(data.error ?? "Не удалось загрузить цены");
        }
        if (cancelled) return;
        const baseById = new Map(items.map((it) => [it.id, it]));
        const nextRows: OverrideRow[] = [];
        for (const o of data.overrides ?? []) {
          const base = baseById.get(o.priceListItemId);
          if (!base) continue;
          nextRows.push({
            priceListItemId: base.id,
            code: base.code,
            name: base.name,
            basePriceRub: base.priceRub,
            individualPriceRub: normalizeRub(o.priceRub),
          });
        }
        nextRows.sort((a, b) => a.code.localeCompare(b.code, "ru"));
        setRows(nextRows);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Ошибка загрузки");
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, targetReady, targetType, clinicId, doctorId, items]);

  const addPicked = () => {
    const next = [...rows];
    const nextSet = new Set(next.map((x) => x.priceListItemId));
    for (const id of pickedIds) {
      if (nextSet.has(id)) continue;
      const it = items.find((x) => x.id === id);
      if (!it) continue;
      next.push({
        priceListItemId: it.id,
        code: it.code,
        name: it.name,
        basePriceRub: it.priceRub,
        individualPriceRub: it.priceRub,
      });
    }
    next.sort((a, b) => a.code.localeCompare(b.code, "ru"));
    setRows(next);
  };

  const addAllFiltered = () => {
    const ids = new Set(pickedIds);
    for (const it of pickFiltered) ids.add(it.id);
    setPickedIds(ids);
  };

  const addBlock = () => {
    if (!blockKey) return;
    const [sec, sub] = blockKey.split(":::");
    const inBlock = items.filter((it) => {
      const s = (it.sectionTitle ?? "").trim();
      const ss = (it.subsectionTitle ?? "").trim();
      if (!sec) return false;
      if (sub) return s === sec && ss === sub;
      return s === sec;
    });
    if (inBlock.length === 0) return;
    const ids = new Set(pickedIds);
    for (const it of inBlock) ids.add(it.id);
    setPickedIds(ids);
  };

  const patchPrice = (id: string, priceRub: number) => {
    setRows((prev) =>
      prev.map((r) =>
        r.priceListItemId === id ? { ...r, individualPriceRub: normalizeRub(priceRub) } : r,
      ),
    );
  };

  const patchDiscount = (id: string, discountPercent: number) => {
    setRows((prev) =>
      prev.map((r) =>
        r.priceListItemId === id
          ? {
              ...r,
              individualPriceRub: priceByDiscount(
                r.basePriceRub,
                Math.max(-1000, Math.min(1000, Number(discountPercent) || 0)),
              ),
            }
          : r,
      ),
    );
  };

  const save = async () => {
    if (!targetReady) return;
    setSaving(true);
    setError(null);
    setOkText(null);
    try {
      const res = await fetch("/api/price-overrides", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          clinicId: clinicId || null,
          doctorId: doctorId || null,
          overrides: rows.map((r) => ({
            priceListItemId: r.priceListItemId,
            priceRub: normalizeRub(r.individualPriceRub),
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Не удалось сохранить");
      }
      setOkText("Сохранено");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="h-9 shrink-0 rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 text-sm font-medium text-[var(--text-strong)] shadow-sm hover:bg-[var(--table-row-hover)]"
        onClick={() => setOpen(true)}
      >
        Создать индивидуальный прайс для контрагента/доктора
      </button>

      {open ? (
        <div className="fixed inset-0 z-[320] flex items-center justify-center bg-zinc-900/45 p-4">
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-semibold text-[var(--app-text)]">
                Индивидуальный прайс
              </h2>
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                onClick={() => setOpen(false)}
              >
                Закрыть
              </button>
            </div>

            <div className="mt-3 grid gap-3 border-b border-[var(--border-subtle)] pb-3">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-[var(--input-border)] bg-[var(--surface-subtle)] px-2 py-1 font-semibold text-[var(--text-body)]">
                  1. Тип: {targetTypeLabel(targetType)}
                </span>
                <span className="rounded-full border border-[var(--input-border)] bg-[var(--surface-subtle)] px-2 py-1 font-semibold text-[var(--text-body)]">
                  2. Контрагент: {selectedTargetName}
                </span>
                <span className="rounded-full border border-[var(--input-border)] bg-[var(--surface-subtle)] px-2 py-1 font-semibold text-[var(--text-body)]">
                  3. Позиции: {rows.length}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    checked={targetType === "CLINIC"}
                    onChange={() => setTargetType("CLINIC")}
                  />
                  Для клиники
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    checked={targetType === "DOCTOR"}
                    onChange={() => setTargetType("DOCTOR")}
                  />
                  Для доктора
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    checked={targetType === "DOCTOR_CLINIC"}
                    onChange={() => setTargetType("DOCTOR_CLINIC")}
                  />
                  Для доктора в конкретной клинике
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {(targetType === "CLINIC" || targetType === "DOCTOR_CLINIC") && (
                  <div className="space-y-1">
                    <input
                      type="search"
                      className="w-full rounded-md border border-[var(--input-border)] px-3 py-2 text-sm"
                      placeholder="Поиск клиники…"
                      value={clinicSearch}
                      onChange={(e) => setClinicSearch(e.target.value)}
                    />
                    <select
                      className="w-full rounded-md border border-[var(--input-border)] px-2 py-2 text-sm"
                      value={clinicId}
                      onChange={(e) => setClinicId(e.target.value)}
                    >
                      <option value="">Выберите клинику</option>
                      {filteredClinics.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {(targetType === "DOCTOR" || targetType === "DOCTOR_CLINIC") && (
                  <div className="space-y-1">
                    <input
                      type="search"
                      className="w-full rounded-md border border-[var(--input-border)] px-3 py-2 text-sm"
                      placeholder="Поиск доктора…"
                      value={doctorSearch}
                      onChange={(e) => setDoctorSearch(e.target.value)}
                    />
                    <select
                      className="w-full rounded-md border border-[var(--input-border)] px-2 py-2 text-sm"
                      value={doctorId}
                      onChange={(e) => setDoctorId(e.target.value)}
                    >
                      <option value="">Выберите доктора</option>
                      {filteredDoctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
            {okText ? <p className="mt-2 text-sm text-emerald-700">{okText}</p> : null}

            {loading ? (
              <p className="mt-4 text-sm text-[var(--text-muted)]">Загрузка…</p>
            ) : !targetReady ? (
              <p className="mt-4 text-sm text-[var(--text-muted)]">
                Выберите контрагента/доктора.
              </p>
            ) : (
              <div className="mt-3 grid min-h-0 flex-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
                <section className="flex min-h-0 flex-col rounded-lg border border-[var(--card-border)] p-3">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                    Выбор позиций
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <input
                      type="search"
                      className="min-w-[14rem] flex-1 rounded-md border border-[var(--input-border)] px-3 py-2 text-sm"
                      placeholder="Поиск по коду, названию, разделу…"
                      value={pickSearch}
                      onChange={(e) => setPickSearch(e.target.value)}
                    />
                    <select
                      className="rounded-md border border-[var(--input-border)] px-2 py-2 text-sm"
                      value={blockKey}
                      onChange={(e) => setBlockKey(e.target.value)}
                    >
                      <option value="">Блок из прайса…</option>
                      {blockOptions.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="rounded-md border border-[var(--input-border)] px-3 py-2 text-sm"
                      onClick={addBlock}
                      disabled={!blockKey}
                    >
                      Добавить блок
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-[var(--input-border)] px-3 py-2 text-sm"
                      onClick={addAllFiltered}
                      disabled={pickFiltered.length === 0}
                    >
                      Выбрать всё по фильтру
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-[var(--input-border)] px-3 py-2 text-sm"
                      onClick={() => setPickedIds(new Set())}
                      disabled={pickedIds.size === 0}
                    >
                      Снять выбор
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-[var(--sidebar-blue)] px-3 py-2 text-sm font-semibold text-white"
                      onClick={addPicked}
                      disabled={pickedIds.size === 0}
                    >
                      Добавить выбранные
                    </button>
                  </div>
                  <div className="mt-2 min-h-0 flex-1 overflow-auto rounded border border-[var(--border-subtle)]">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                          <th className="px-3 py-2 text-left">Позиция</th>
                          <th className="px-2 py-2 text-left">Блок</th>
                          <th className="px-2 py-2 text-right">Цена</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pickFiltered.map((it) => {
                          const checked = pickedIds.has(it.id);
                          return (
                            <tr
                              key={it.id}
                              className="border-b border-[var(--border-subtle)] last:border-b-0"
                            >
                              <td className="px-3 py-2">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      setPickedIds((prev) => {
                                        const next = new Set(prev);
                                        if (e.target.checked) next.add(it.id);
                                        else next.delete(it.id);
                                        return next;
                                      });
                                    }}
                                  />
                                  <span className="font-mono text-xs text-[var(--text-secondary)]">
                                    {it.code}
                                  </span>
                                  <span>{it.name}</span>
                                  {rowIdSet.has(it.id) ? (
                                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-900">
                                      добавлено
                                    </span>
                                  ) : null}
                                </label>
                              </td>
                              <td className="px-2 py-2 text-xs text-[var(--text-secondary)]">
                                {it.sectionTitle
                                  ? `${it.sectionTitle}${it.subsectionTitle ? ` / ${it.subsectionTitle}` : ""}`
                                  : "—"}
                              </td>
                              <td className="whitespace-nowrap px-2 py-2 text-right text-xs text-[var(--text-secondary)]">
                                {it.priceRub.toLocaleString("ru-RU")} ₽
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="flex min-h-0 flex-col rounded-lg border border-[var(--card-border)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                      Индивидуальные цены
                    </h3>
                    <button
                      type="button"
                      className="text-xs text-[var(--text-muted)] underline hover:text-[var(--text-strong)] disabled:no-underline"
                      disabled={rows.length === 0}
                      onClick={() => setRows([])}
                    >
                      Очистить все
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Скидка и индивидуальная цена связаны между собой.
                  </p>
                  <div className="mt-2 min-h-0 flex-1 overflow-auto rounded border border-[var(--border-subtle)]">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                          <th className="px-2 py-2 text-left">Код</th>
                          <th className="px-2 py-2 text-right">База</th>
                          <th className="px-2 py-2 text-right">Скидка %</th>
                          <th className="px-2 py-2 text-right">Инд. цена</th>
                          <th className="px-2 py-2 text-center">—</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr
                            key={r.priceListItemId}
                            className="border-b border-[var(--border-subtle)] last:border-b-0"
                          >
                            <td className="px-2 py-2">
                              <div className="font-mono text-xs text-[var(--text-secondary)]">
                                {r.code}
                              </div>
                              <div className="text-xs">{r.name}</div>
                            </td>
                            <td className="px-2 py-2 text-right text-xs">
                              {r.basePriceRub.toLocaleString("ru-RU")} ₽
                            </td>
                            <td className="px-2 py-2 text-right">
                              <input
                                type="number"
                                step={0.1}
                                value={discountValue(
                                  r.basePriceRub,
                                  r.individualPriceRub,
                                )}
                                onChange={(e) =>
                                  patchDiscount(r.priceListItemId, Number(e.target.value))
                                }
                                className="w-20 rounded border border-[var(--input-border)] px-2 py-1 text-right text-xs"
                              />
                            </td>
                            <td className="px-2 py-2 text-right">
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={r.individualPriceRub}
                                onChange={(e) =>
                                  patchPrice(r.priceListItemId, Number(e.target.value))
                                }
                                className="w-24 rounded border border-[var(--input-border)] px-2 py-1 text-right text-xs"
                              />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button
                                type="button"
                                className="text-xs text-red-600 underline"
                                onClick={() =>
                                  setRows((prev) =>
                                    prev.filter((x) => x.priceListItemId !== r.priceListItemId),
                                  )
                                }
                              >
                                Удалить
                              </button>
                            </td>
                          </tr>
                        ))}
                        {rows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-3 py-4 text-center text-sm text-[var(--text-muted)]"
                            >
                              Пока нет выбранных позиций.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-3">
              <button
                type="button"
                className="rounded-md border border-[var(--card-border)] px-3 py-1.5 text-sm"
                onClick={() => setOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={saving || !targetReady}
                className="rounded-md bg-[var(--sidebar-blue)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => void save()}
              >
                {saving ? "Сохранение…" : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
