"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CostingColumn, CostingColumnKind } from "@prisma/client";
import { evaluateCostingColumns } from "@/lib/costing-evaluate";
import { mergePoolVarsIntoInputs } from "@/lib/costing-merge-pool-inputs";
import { clinicSelectLabel } from "@/lib/clients-order-ui";

type VersionRow = {
  id: string;
  title: string;
  effectiveFrom: string | null;
  archived: boolean;
  createdAt: string;
  _count: {
    columns: number;
    lines: number;
    profiles: number;
    sharedPools: number;
    fixedCostItems?: number;
  };
};

type PriceLite = { id: string; code: string; name: string; priceRub: number };

type PoolShareRow = { poolId: string; shareRub: number };

type SharedPoolRow = {
  id: string;
  key: string;
  label: string;
  totalRub: number;
  sortOrder: number;
};

type LineRow = {
  id: string;
  note: string | null;
  inputsJson: unknown;
  priceListItemId: string | null;
  priceListItem: PriceLite | null;
  poolShares: PoolShareRow[];
};

type ProfileRow = {
  id: string;
  name: string;
  listDiscountPercent: number;
  clinicId: string | null;
  note: string | null;
  clinic: { id: string; name: string } | null;
};

type FixedCostItemRow = {
  id: string;
  label: string;
  amountRub: number;
  sortOrder: number;
};

type WorkloadStats = {
  ordersInPeriod: number;
  avgWorksPerMonth: number;
  periodLabel: string;
};

type EditorPayload = {
  version: {
    id: string;
    title: string;
    effectiveFrom: string | null;
    archived: boolean;
    monthlyFixedCostsRub: number;
    fixedCostsPeriodNote: string | null;
    expectedWorksPerMonth: number | null;
    createdAt: string;
    updatedAt: string;
  };
  columns: CostingColumn[];
  lines: LineRow[];
  profiles: ProfileRow[];
  sharedPools: SharedPoolRow[];
  fixedCostItems: FixedCostItemRow[];
  workload: WorkloadStats;
};

type ClinicOpt = {
  id: string;
  name: string;
  address?: string | null;
  isActive?: boolean;
};

type TabId = "table" | "columns" | "pools" | "fixedCosts" | "profiles";
type FillDrag = {
  kind: "input" | "pool";
  key: string;
  lineId: string;
  startIndex: number;
  currentIndex: number;
  value: number;
};

function coerceRecord(raw: unknown): Record<string, number> {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "string" && v.trim() !== "") {
      const n = Number.parseFloat(v.replace(",", "."));
      if (Number.isFinite(n)) out[k] = n;
    }
  }
  return out;
}

function initLineShares(lines: LineRow[], pools: SharedPoolRow[]): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const ln of lines) {
    const m: Record<string, number> = {};
    for (const p of pools) m[p.id] = 0;
    for (const ps of ln.poolShares ?? []) m[ps.poolId] = ps.shareRub;
    out[ln.id] = m;
  }
  return out;
}

function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

export function CostingDirectoryClient() {
  const [tab, setTab] = useState<TabId>("table");
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorPayload | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [colDraft, setColDraft] = useState<CostingColumn[]>([]);
  const [lineInputs, setLineInputs] = useState<Record<string, Record<string, number>>>({});
  const [lineShares, setLineShares] = useState<Record<string, Record<string, number>>>({});

  const [profileId, setProfileId] = useState<string | "">("");

  const [newTitle, setNewTitle] = useState("");
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileDiscount, setNewProfileDiscount] = useState("0");
  const [newProfileClinicId, setNewProfileClinicId] = useState("");
  const [clinics, setClinics] = useState<ClinicOpt[]>([]);

  const [newPoolKey, setNewPoolKey] = useState("");
  const [newPoolLabel, setNewPoolLabel] = useState("");
  const [newPoolTotal, setNewPoolTotal] = useState("");
  const [fillDrag, setFillDrag] = useState<FillDrag | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    "__position": 240,
    "__note": 170,
  });

  const loadVersions = useCallback(async () => {
    setLoadErr(null);
    try {
      const res = await fetch("/api/costing/versions");
      const data = (await res.json()) as VersionRow[] | { error?: string };
      if (!res.ok) throw new Error("error" in data ? String(data.error) : "Ошибка");
      setVersions(Array.isArray(data) ? data : []);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Ошибка");
    }
  }, []);

  const loadEditor = useCallback(async (id: string) => {
    setLoadErr(null);
    try {
      const res = await fetch(`/api/costing/versions/${id}/editor`);
      const data = (await res.json()) as EditorPayload | { error?: string };
      if (!res.ok) throw new Error("error" in data ? String(data.error) : "Ошибка");
      if (!("columns" in data)) throw new Error("Некорректный ответ");
      const raw = data as EditorPayload;
      const normalized: EditorPayload = {
        ...raw,
        fixedCostItems: Array.isArray(raw.fixedCostItems) ? raw.fixedCostItems : [],
        workload: raw.workload ?? {
          ordersInPeriod: 0,
          avgWorksPerMonth: 0,
          periodLabel: "—",
        },
        version: {
          ...raw.version,
          monthlyFixedCostsRub: raw.version.monthlyFixedCostsRub ?? 0,
          fixedCostsPeriodNote: raw.version.fixedCostsPeriodNote ?? null,
          expectedWorksPerMonth:
            typeof raw.version.expectedWorksPerMonth === "number" &&
            Number.isFinite(raw.version.expectedWorksPerMonth)
              ? raw.version.expectedWorksPerMonth
              : null,
        },
      };
      setEditor(normalized);
      setColDraft(normalized.columns.map((c) => ({ ...c })));
      const li: Record<string, Record<string, number>> = {};
      for (const ln of normalized.lines) li[ln.id] = coerceRecord(ln.inputsJson);
      setLineInputs(li);
      setLineShares(initLineShares(normalized.lines, normalized.sharedPools));
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Ошибка");
    }
  }, []);

  useEffect(() => {
    void loadVersions();
  }, [loadVersions]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/clinics");
        const data = (await res.json()) as { clinics?: ClinicOpt[] };
        if (res.ok && Array.isArray(data.clinics)) setClinics(data.clinics);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    if (versionId) void loadEditor(versionId);
    else {
      setEditor(null);
      setColDraft([]);
      setLineInputs({});
      setLineShares({});
    }
  }, [versionId, loadEditor]);

  const columnsLite = useMemo(
    () =>
      (editor?.columns ?? []).map((c) => ({
        key: c.key,
        kind: c.kind,
        formula: c.formula,
        sortOrder: c.sortOrder,
      })),
    [editor?.columns],
  );

  const inputColumns = useMemo(
    () => (editor?.columns ?? []).filter((c) => c.kind === "INPUT"),
    [editor?.columns],
  );

  const computedColumns = useMemo(
    () => (editor?.columns ?? []).filter((c) => c.kind === "COMPUTED"),
    [editor?.columns],
  );

  const lineIndexById = useMemo(() => {
    const map = new Map<string, number>();
    for (const [i, ln] of (editor?.lines ?? []).entries()) map.set(ln.id, i);
    return map;
  }, [editor?.lines]);

  const profileDiscount = useMemo(() => {
    if (!profileId || !editor) return null;
    const p = editor.profiles.find((x) => x.id === profileId);
    return p?.listDiscountPercent ?? null;
  }, [profileId, editor]);

  const evalLine = useCallback(
    (lineId: string) => {
      if (!editor || !columnsLite.length) {
        return { values: {} as Record<string, number>, errors: [] as string[] };
      }
      const base = { ...(lineInputs[lineId] ?? {}) };
      if (profileDiscount != null) base.profile_discount_pct = profileDiscount;
      const shares = lineShares[lineId] ?? {};
      const merged = mergePoolVarsIntoInputs(base, editor.sharedPools, shares);
      return evaluateCostingColumns(columnsLite, merged);
    },
    [editor, columnsLite, lineInputs, lineShares, profileDiscount],
  );

  const poolColumnSums = useMemo(() => {
    if (!editor) return {};
    const sums: Record<string, number> = {};
    for (const p of editor.sharedPools) sums[p.id] = 0;
    for (const ln of editor.lines) {
      const sh = lineShares[ln.id] ?? {};
      for (const p of editor.sharedPools) sums[p.id] = (sums[p.id] ?? 0) + (sh[p.id] ?? 0);
    }
    return sums;
  }, [editor, lineShares]);

  const inputColumnSums = useMemo(() => {
    if (!editor) return {};
    const sums: Record<string, number> = {};
    for (const c of inputColumns) sums[c.key] = 0;
    for (const ln of editor.lines) {
      const row = lineInputs[ln.id] ?? {};
      for (const c of inputColumns) sums[c.key] = (sums[c.key] ?? 0) + (row[c.key] ?? 0);
    }
    return sums;
  }, [editor, inputColumns, lineInputs]);

  const computedColumnSums = useMemo(() => {
    if (!editor) return {};
    const sums: Record<string, number> = {};
    for (const c of computedColumns) sums[c.key] = 0;
    for (const ln of editor.lines) {
      const { values } = evalLine(ln.id);
      for (const c of computedColumns) sums[c.key] = (sums[c.key] ?? 0) + (values[c.key] ?? 0);
    }
    return sums;
  }, [editor, computedColumns, evalLine]);

  /** Сумма «цена клиенту» по строкам — как выручка по этой таблице (при необходимости замените логику на другую колонку). */
  const tableClientPriceSum = useMemo(() => {
    if (!editor) return 0;
    let s = 0;
    for (const ln of editor.lines) {
      const v = lineInputs[ln.id]?.client_price;
      if (typeof v === "number" && Number.isFinite(v)) s += v;
    }
    return s;
  }, [editor, lineInputs]);

  const fixedCostsRub = useMemo(() => {
    if (!editor) return 0;
    const items = editor.fixedCostItems ?? [];
    if (items.length > 0) {
      return items.reduce((s, it) => s + (Number.isFinite(it.amountRub) ? it.amountRub : 0), 0);
    }
    return editor.version.monthlyFixedCostsRub ?? 0;
  }, [editor]);

  const netProfitVsFixed = tableClientPriceSum - fixedCostsRub;

  const fixedPerExpectedWork = useMemo(() => {
    if (!editor) return null;
    const exp = editor.version.expectedWorksPerMonth;
    if (exp == null || !Number.isFinite(exp) || exp <= 0) return null;
    return fixedCostsRub / exp;
  }, [editor, fixedCostsRub]);

  const fixedPerAvgWork = useMemo(() => {
    if (!editor) return null;
    const avg = editor.workload?.avgWorksPerMonth ?? 0;
    if (!Number.isFinite(avg) || avg <= 0) return null;
    return fixedCostsRub / avg;
  }, [editor, fixedCostsRub]);

  async function bootstrapDefaults() {
    setBanner(null);
    setSaving(true);
    try {
      const res = await fetch("/api/costing/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromDefaults: true }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Ошибка");
      await loadVersions();
      if (data.id) setVersionId(data.id);
      setBanner("Шаблон создан из prisma/costing-seed-defaults.json");
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  async function createEmptyVersion() {
    const title = newTitle.trim() || "Новая версия";
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch("/api/costing/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Ошибка");
      setNewTitle("");
      await loadVersions();
      if (data.id) setVersionId(data.id);
      setBanner("Пустая версия создана.");
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  async function duplicateVersion() {
    if (!versionId) return;
    const title = window.prompt("Название копии", `${editor?.version.title ?? ""} (копия)`);
    if (title == null) return;
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch("/api/costing/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duplicateFromId: versionId, title: title.trim() || undefined }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Ошибка");
      await loadVersions();
      if (data.id) setVersionId(data.id);
      setBanner("Версия скопирована (включая общие затраты и доли).");
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  async function saveVersionMeta() {
    if (!editor) return;
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/costing/versions/${editor.version.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editor.version.title,
          archived: editor.version.archived,
          effectiveFrom: editor.version.effectiveFrom,
          fixedCostsPeriodNote: editor.version.fixedCostsPeriodNote,
          expectedWorksPerMonth: editor.version.expectedWorksPerMonth,
        }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        throw new Error(d.error ?? "Ошибка");
      }
      await loadVersions();
      await loadEditor(editor.version.id);
      setBanner("Сохранено.");
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  async function saveColumns() {
    if (!versionId) return;
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/costing/versions/${versionId}/columns`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          columns: colDraft.map((c) => ({
            key: c.key,
            label: c.label,
            kind: c.kind,
            formula: c.formula,
            sortOrder: c.sortOrder,
            hint: c.hint,
          })),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Ошибка");
      await loadEditor(versionId);
      setBanner("Колонки сохранены.");
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  async function saveGrid() {
    if (!editor) return;
    setSaving(true);
    setBanner(null);
    try {
      for (const ln of editor.lines) {
        const inputs = lineInputs[ln.id] ?? coerceRecord(ln.inputsJson);
        const shMap = lineShares[ln.id] ?? {};
        const poolShares = editor.sharedPools.map((p) => ({
          poolId: p.id,
          shareRub: shMap[p.id] ?? 0,
        }));
        const res = await fetch(`/api/costing/lines/${ln.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inputsJson: inputs, poolShares }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? `Строка ${ln.id}`);
      }
      await loadEditor(editor.version.id);
      setBanner("Таблица сохранена.");
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  function setInputCell(lineId: string, key: string, raw: string) {
    setLineInputs((prev) => {
      const row = { ...(prev[lineId] ?? {}) };
      if (raw === "") delete row[key];
      else {
        const n = Number.parseFloat(raw.replace(",", "."));
        if (Number.isFinite(n)) row[key] = n;
      }
      return { ...prev, [lineId]: row };
    });
  }

  function setShareCell(lineId: string, poolId: string, raw: string) {
    setLineShares((prev) => {
      const row = { ...(prev[lineId] ?? {}) };
      const n = raw === "" ? 0 : Number.parseFloat(raw.replace(",", "."));
      row[poolId] = Number.isFinite(n) ? n : 0;
      return { ...prev, [lineId]: row };
    });
  }

  function getColumnWidth(colKey: string, fallback: number) {
    return columnWidths[colKey] ?? fallback;
  }

  function setColumnWidth(colKey: string, width: number) {
    const next = Math.max(84, Math.min(560, Math.round(width)));
    setColumnWidths((prev) => ({ ...prev, [colKey]: next }));
  }

  function startResize(colKey: string, startX: number, startWidth: number) {
    const onMove = (ev: MouseEvent) => {
      setColumnWidth(colKey, startWidth + (ev.clientX - startX));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function startFillDrag(kind: "input" | "pool", key: string, lineId: string, value: number) {
    const startIndex = lineIndexById.get(lineId);
    if (startIndex == null) return;
    setFillDrag({
      kind,
      key,
      lineId,
      startIndex,
      currentIndex: startIndex,
      value,
    });
  }

  function updateFillDragTarget(kind: "input" | "pool", key: string, lineId: string) {
    setFillDrag((prev) => {
      if (!prev) return prev;
      if (prev.kind !== kind || prev.key !== key) return prev;
      const idx = lineIndexById.get(lineId);
      if (idx == null || idx === prev.currentIndex) return prev;
      return { ...prev, currentIndex: idx };
    });
  }

  useEffect(() => {
    if (!fillDrag || !editor) return;
    const onUp = () => {
      const from = Math.min(fillDrag.startIndex, fillDrag.currentIndex);
      const to = Math.max(fillDrag.startIndex, fillDrag.currentIndex);
      const range = editor.lines.slice(from, to + 1);
      if (range.length > 0) {
        if (fillDrag.kind === "input") {
          setLineInputs((prev) => {
            const next = { ...prev };
            for (const ln of range) {
              next[ln.id] = { ...(next[ln.id] ?? {}), [fillDrag.key]: fillDrag.value };
            }
            return next;
          });
        } else {
          setLineShares((prev) => {
            const next = { ...prev };
            for (const ln of range) {
              next[ln.id] = { ...(next[ln.id] ?? {}), [fillDrag.key]: fillDrag.value };
            }
            return next;
          });
        }
      }
      setFillDrag(null);
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, [fillDrag, editor]);

  function pullPriceFromList(lineId: string) {
    const ln = editor?.lines.find((l) => l.id === lineId);
    const rub = ln?.priceListItem?.priceRub;
    if (rub == null) {
      setBanner("Нет привязки к прайсу или цены.");
      return;
    }
    setLineInputs((prev) => ({
      ...prev,
      [lineId]: { ...(prev[lineId] ?? {}), client_price: rub },
    }));
  }

  async function addSharedPool() {
    if (!versionId) return;
    const key = newPoolKey.trim();
    const label = newPoolLabel.trim();
    if (!key || !label) {
      setBanner("Укажите ключ и подпись пула.");
      return;
    }
    const totalRub = Number.parseFloat(newPoolTotal.replace(",", "."));
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/costing/versions/${versionId}/shared-pools`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          label,
          totalRub: Number.isFinite(totalRub) ? totalRub : 0,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Ошибка");
      setNewPoolKey("");
      setNewPoolLabel("");
      setNewPoolTotal("");
      await loadEditor(versionId);
      setBanner("Пул добавлен. В формулах используйте sh_" + key);
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  async function deletePool(id: string) {
    if (!window.confirm("Удалить пул и все доли по строкам?")) return;
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/costing/shared-pools/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        throw new Error(d.error ?? "Ошибка");
      }
      if (versionId) await loadEditor(versionId);
      setBanner("Пул удалён.");
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  async function saveExpectedWorkload() {
    if (!editor) return;
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/costing/versions/${editor.version.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedWorksPerMonth: editor.version.expectedWorksPerMonth }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        throw new Error(d.error ?? "Ошибка");
      }
      await loadEditor(editor.version.id);
      setBanner("Ожидаемая нагрузка сохранена.");
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  async function addFixedCostItem() {
    if (!versionId) return;
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/costing/versions/${versionId}/fixed-cost-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "Новая статья", amountRub: 0 }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Ошибка");
      await loadEditor(versionId);
      setBanner("Пункт добавлен.");
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  async function patchFixedCostItem(id: string, patch: { label?: string; amountRub?: number }) {
    if (!versionId) return;
    try {
      const res = await fetch(`/api/costing/fixed-cost-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Ошибка");
      await loadEditor(versionId);
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Ошибка");
    }
  }

  async function deleteFixedCostItem(id: string) {
    if (!window.confirm("Удалить пункт постоянных расходов?")) return;
    if (!versionId) return;
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/costing/fixed-cost-items/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        throw new Error(d.error ?? "Ошибка");
      }
      await loadEditor(versionId);
      setBanner("Удалено.");
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  async function addProfile() {
    if (!versionId) return;
    const name = newProfileName.trim();
    if (!name) {
      setBanner("Введите название профиля.");
      return;
    }
    const pct = Number.parseFloat(newProfileDiscount.replace(",", "."));
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/costing/versions/${versionId}/profiles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          listDiscountPercent: Number.isFinite(pct) ? pct : 0,
          clinicId: newProfileClinicId.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Ошибка");
      setNewProfileName("");
      setNewProfileDiscount("0");
      setNewProfileClinicId("");
      await loadEditor(versionId);
      setBanner("Профиль добавлен.");
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  const tabBtn = (id: TabId, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      className={`rounded-lg px-4 py-2 text-base font-medium ${
        tab === id
          ? "bg-[var(--sidebar-blue)] text-white"
          : "border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--app-text)] hover:border-[var(--sidebar-blue)]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      {loadErr ? (
        <p className="text-sm text-amber-800" role="alert">
          {loadErr}
        </p>
      ) : null}
      {banner ? (
        <p
          className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--app-text)]"
          role="status"
        >
          {banner}
        </p>
      ) : null}

      <section className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-xs font-semibold uppercase text-[var(--text-muted)]">
            Версия
          </span>
          <select
            className="mt-1 min-w-[16rem] rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm"
            value={versionId ?? ""}
            onChange={(e) => setVersionId(e.target.value || null)}
          >
            <option value="">— выберите —</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.archived ? "[архив] " : ""}
                {v.title} · {v._count.lines} стр. · {v._count.sharedPools} общ.
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={() => void bootstrapDefaults()}
          className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm font-medium hover:border-[var(--sidebar-blue)] disabled:opacity-50"
        >
          Шаблон
        </button>
        <div className="flex flex-wrap items-end gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Новая версия"
            className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => void createEmptyVersion()}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm font-medium hover:border-[var(--sidebar-blue)] disabled:opacity-50"
          >
            Пустая
          </button>
        </div>
        {versionId ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => void duplicateVersion()}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm font-medium hover:border-[var(--sidebar-blue)] disabled:opacity-50"
          >
            Дублировать
          </button>
        ) : null}
      </section>

      {editor ? (
        <>
          <div className="flex flex-wrap gap-2 border-b border-[var(--card-border)] pb-3">
            {tabBtn("table", "Таблица")}
            {tabBtn("columns", "Колонки и формулы")}
            {tabBtn("pools", "Общие затраты")}
            {tabBtn("fixedCosts", "Постоянные расходы")}
            {tabBtn("profiles", "Версия и профили")}
          </div>

          {tab === "table" ? (
            <section className="space-y-4">
              <p className="text-base leading-relaxed text-[var(--text-secondary)]">
                Одна строка = одна позиция расчёта. Общие статьи (аренда, лицензии) задаются во вкладке «Общие затраты»;
                в формулах колонок доступны переменные <code className="rounded bg-[var(--surface-muted)] px-1 text-sm">sh_ключ</code> — доля строки в ₽.
                Чистая прибыль на уровне версии: <strong>выручка</strong> (здесь — сумма «цена клиенту» по таблице) минус{" "}
                <strong>постоянные расходы</strong> из вкладки «Постоянные расходы» (аренда, оклады, коммуналка и т.д.) — за
                тот же период, что и выручка.
                Подсказка по UX: сетка как в Excel /{" "}
                <a
                  href="https://standfin.ru/"
                  className="text-[var(--sidebar-blue)] hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Standfin
                </a>
                .
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-base">
                  <span className="block text-sm font-semibold text-[var(--text-muted)]">
                    Профиль (скидка % для превью)
                  </span>
                  <select
                    className="mt-1.5 min-w-[14rem] rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-base"
                    value={profileId}
                    onChange={(e) => setProfileId(e.target.value)}
                  >
                    <option value="">— как в ячейке скидки строки —</option>
                    {editor.profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (−{p.listDiscountPercent}%)
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={saving || !editor.lines.length}
                  onClick={() => void saveGrid()}
                  className="rounded-lg bg-[var(--sidebar-blue)] px-5 py-2.5 text-base font-medium text-white disabled:opacity-50"
                >
                  Сохранить таблицу
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm">
                <table className="w-max border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--card-border)] bg-[var(--surface-muted)]">
                      <th
                        className="sticky left-0 z-20 relative shrink-0 border-r border-[var(--card-border)] bg-[var(--surface-muted)] px-3 py-3 text-sm font-semibold text-[var(--app-text)] shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)]"
                        style={{ width: getColumnWidth("__position", 240), minWidth: getColumnWidth("__position", 240) }}
                      >
                        Позиция
                        <span
                          role="separator"
                          aria-label="Изменить ширину колонки"
                          className="absolute right-0 top-0 h-full w-2 cursor-col-resize"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            startResize("__position", e.clientX, getColumnWidth("__position", 240));
                          }}
                        />
                      </th>
                      <th
                        className="sticky z-20 relative shrink-0 border-r border-[var(--card-border)] bg-[var(--surface-muted)] px-2 py-3 text-sm font-semibold text-[var(--app-text)] shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)]"
                        style={{
                          left: getColumnWidth("__position", 240),
                          width: getColumnWidth("__note", 170),
                          minWidth: getColumnWidth("__note", 170),
                        }}
                      >
                        Заметка
                        <span
                          role="separator"
                          aria-label="Изменить ширину колонки"
                          className="absolute right-0 top-0 h-full w-2 cursor-col-resize"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            startResize("__note", e.clientX, getColumnWidth("__note", 170));
                          }}
                        />
                      </th>
                      {inputColumns.map((c) => (
                        <th
                          key={c.id}
                          className="relative shrink-0 whitespace-normal break-words px-2 py-2 text-center text-xs font-semibold leading-snug text-[var(--app-text)]"
                          style={{ width: getColumnWidth(`in:${c.key}`, 116), minWidth: getColumnWidth(`in:${c.key}`, 116) }}
                          title={c.hint ?? undefined}
                        >
                          {c.label}
                          <span
                            role="separator"
                            aria-label="Изменить ширину колонки"
                            className="absolute right-0 top-0 h-full w-2 cursor-col-resize"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              startResize(`in:${c.key}`, e.clientX, getColumnWidth(`in:${c.key}`, 116));
                            }}
                          />
                        </th>
                      ))}
                      {editor.sharedPools.map((p) => (
                        <th
                          key={p.id}
                          className="relative shrink-0 whitespace-normal break-words bg-amber-50/80 px-2 py-2 text-center text-xs font-semibold leading-snug text-amber-950 dark:bg-amber-950/25 dark:text-amber-50"
                          style={{ width: getColumnWidth(`sh:${p.id}`, 112), minWidth: getColumnWidth(`sh:${p.id}`, 112) }}
                          title={`Пул «${p.label}». В формулах: sh_${p.key}`}
                        >
                          ↑ {p.label}
                          <span className="mt-1 block font-mono text-[11px] font-normal opacity-85">
                            sh_{p.key}
                          </span>
                          <span
                            role="separator"
                            aria-label="Изменить ширину колонки"
                            className="absolute right-0 top-0 h-full w-2 cursor-col-resize"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              startResize(`sh:${p.id}`, e.clientX, getColumnWidth(`sh:${p.id}`, 112));
                            }}
                          />
                        </th>
                      ))}
                      {computedColumns.map((c) => (
                        <th
                          key={c.id}
                          className="relative shrink-0 whitespace-normal break-words bg-emerald-50/60 px-2 py-2 text-center text-xs font-semibold leading-snug text-emerald-950 dark:bg-emerald-950/25 dark:text-emerald-50"
                          style={{ width: getColumnWidth(`co:${c.key}`, 124), minWidth: getColumnWidth(`co:${c.key}`, 124) }}
                          title={c.hint ?? undefined}
                        >
                          = {c.label}
                          <span
                            role="separator"
                            aria-label="Изменить ширину колонки"
                            className="absolute right-0 top-0 h-full w-2 cursor-col-resize"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              startResize(`co:${c.key}`, e.clientX, getColumnWidth(`co:${c.key}`, 124));
                            }}
                          />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {editor.lines.map((ln) => {
                      const { values, errors } = evalLine(ln.id);
                      return (
                        <tr
                          key={ln.id}
                          className="border-b border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--surface-muted)]/35"
                        >
                          <td
                            className="sticky left-0 z-10 shrink-0 border-r border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2.5 text-sm leading-snug"
                            style={{ width: getColumnWidth("__position", 240), minWidth: getColumnWidth("__position", 240) }}
                          >
                            <div className="font-mono text-[var(--app-text)]">
                              {ln.priceListItem?.code ?? "—"}
                              {ln.priceListItem ? (
                                <button
                                  type="button"
                                  className="ml-1.5 text-xs text-[var(--sidebar-blue)] hover:underline"
                                  onClick={() => pullPriceFromList(ln.id)}
                                >
                                  прайс
                                </button>
                              ) : null}
                            </div>
                            <div className="mt-1 text-sm leading-snug text-[var(--text-secondary)]">
                              {ln.priceListItem?.name ?? "—"}
                            </div>
                          </td>
                          <td
                            className="sticky z-10 shrink-0 border-r border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-2"
                            style={{
                              left: getColumnWidth("__position", 240),
                              width: getColumnWidth("__note", 170),
                              minWidth: getColumnWidth("__note", 170),
                            }}
                          >
                            <textarea
                              className="w-full min-w-0 resize-y rounded-md border border-transparent bg-transparent px-1.5 py-1.5 text-sm leading-snug hover:border-[var(--card-border)]"
                              defaultValue={ln.note ?? ""}
                              key={`n-${ln.id}-${ln.note ?? ""}`}
                              rows={2}
                              onBlur={(e) => {
                                const v = e.target.value.trim() || null;
                                void fetch(`/api/costing/lines/${ln.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ note: v }),
                                }).then(() => {
                                  if (versionId) void loadEditor(versionId);
                                });
                              }}
                            />
                          </td>
                          {inputColumns.map((c) => (
                            <td
                              key={c.id}
                              className="shrink-0 px-1.5 py-2 text-center align-middle"
                              style={{ width: getColumnWidth(`in:${c.key}`, 116), minWidth: getColumnWidth(`in:${c.key}`, 116) }}
                              onMouseEnter={() => updateFillDragTarget("input", c.key, ln.id)}
                            >
                              <input
                                type="number"
                                className="w-[6.25rem] rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-2 text-center font-mono text-sm tabular-nums"
                                value={lineInputs[ln.id]?.[c.key] ?? ""}
                                onChange={(e) => setInputCell(ln.id, c.key, e.target.value)}
                              />
                              <button
                                type="button"
                                className="mt-1 inline-block h-2 w-2 cursor-ns-resize rounded-sm bg-[var(--text-muted)]/60"
                                title="Протянуть значение вверх/вниз"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  const v = lineInputs[ln.id]?.[c.key];
                                  startFillDrag("input", c.key, ln.id, Number.isFinite(v) ? Number(v) : 0);
                                }}
                              />
                            </td>
                          ))}
                          {editor.sharedPools.map((p) => (
                            <td
                              key={p.id}
                              className="shrink-0 bg-amber-50/40 px-1.5 py-2 text-center align-middle dark:bg-amber-950/15"
                              style={{ width: getColumnWidth(`sh:${p.id}`, 112), minWidth: getColumnWidth(`sh:${p.id}`, 112) }}
                              onMouseEnter={() => updateFillDragTarget("pool", p.id, ln.id)}
                            >
                              <input
                                type="number"
                                className="w-[6.25rem] rounded-md border border-amber-200/90 bg-white/95 px-2 py-2 text-center font-mono text-sm tabular-nums dark:border-amber-800 dark:bg-amber-950/40"
                                value={lineShares[ln.id]?.[p.id] ?? ""}
                                onChange={(e) => setShareCell(ln.id, p.id, e.target.value)}
                              />
                              <button
                                type="button"
                                className="mt-1 inline-block h-2 w-2 cursor-ns-resize rounded-sm bg-amber-700/60"
                                title="Протянуть значение вверх/вниз"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  const v = lineShares[ln.id]?.[p.id];
                                  startFillDrag("pool", p.id, ln.id, Number.isFinite(v) ? Number(v) : 0);
                                }}
                              />
                            </td>
                          ))}
                          {computedColumns.map((c) => (
                            <td
                              key={c.id}
                              className="shrink-0 bg-emerald-50/35 px-2 py-2 text-center align-middle font-mono text-sm tabular-nums text-emerald-950 dark:bg-emerald-950/15 dark:text-emerald-100"
                              style={{ width: getColumnWidth(`co:${c.key}`, 124), minWidth: getColumnWidth(`co:${c.key}`, 124) }}
                              title={errors.length ? errors.join("\n") : undefined}
                            >
                              {fmtNum(values[c.key] ?? NaN)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[var(--card-border)] bg-[var(--surface-muted)] text-sm font-semibold">
                      <td
                        colSpan={2}
                        className="sticky left-0 z-10 shrink-0 border-r border-[var(--card-border)] bg-[var(--surface-muted)] px-3 py-3 text-base shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)]"
                        style={{
                          width: getColumnWidth("__position", 240) + getColumnWidth("__note", 170),
                          minWidth: getColumnWidth("__position", 240) + getColumnWidth("__note", 170),
                        }}
                      >
                        Итого
                      </td>
                      {inputColumns.map((c) => (
                        <td
                          key={c.id}
                          className="shrink-0 px-1.5 py-3 text-center font-mono text-sm tabular-nums"
                          style={{ width: getColumnWidth(`in:${c.key}`, 116), minWidth: getColumnWidth(`in:${c.key}`, 116) }}
                        >
                          {fmtNum(inputColumnSums[c.key] ?? 0)}
                        </td>
                      ))}
                      {editor.sharedPools.map((p) => {
                        const sum = poolColumnSums[p.id] ?? 0;
                        const drift = Math.abs(sum - p.totalRub) > 0.01 && p.totalRub > 0;
                        return (
                          <td
                            key={p.id}
                            className={`shrink-0 px-1.5 py-3 text-center font-mono text-sm tabular-nums ${drift ? "text-amber-800 dark:text-amber-200" : ""}`}
                            style={{ width: getColumnWidth(`sh:${p.id}`, 112), minWidth: getColumnWidth(`sh:${p.id}`, 112) }}
                            title={drift ? "Сумма долей ≠ ориентиру «всего» в пуле" : undefined}
                          >
                            {fmtNum(sum)}
                            {p.totalRub > 0 ? (
                              <span className="mt-0.5 block text-xs font-normal opacity-75">
                                / {fmtNum(p.totalRub)}
                              </span>
                            ) : null}
                          </td>
                        );
                      })}
                      {computedColumns.map((c) => (
                        <td
                          key={c.id}
                          className="shrink-0 px-2 py-3 text-center font-mono text-sm tabular-nums"
                          style={{ width: getColumnWidth(`co:${c.key}`, 124), minWidth: getColumnWidth(`co:${c.key}`, 124) }}
                        >
                          {fmtNum(computedColumnSums[c.key] ?? 0)}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-muted)]/60 p-5 text-base">
                <h3 className="text-lg font-semibold text-[var(--app-text)]">Чистая прибыль (ваша методология)</h3>
                <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3">
                    <dt className="text-sm font-medium text-[var(--text-muted)]">Выручка по таблице</dt>
                    <dd className="mt-2 font-mono text-2xl font-semibold tracking-tight text-[var(--app-text)]">
                      {fmtNum(tableClientPriceSum)} ₽
                    </dd>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      Σ колонки <code className="rounded bg-[var(--surface-muted)] px-1 text-sm">client_price</code>
                    </p>
                  </div>
                  <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3">
                    <dt className="text-sm font-medium text-[var(--text-muted)]">Постоянные расходы</dt>
                    <dd className="mt-2 font-mono text-2xl font-semibold tracking-tight text-[var(--app-text)]">
                      {fmtNum(fixedCostsRub)} ₽
                    </dd>
                    {editor.version.fixedCostsPeriodNote ? (
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        {editor.version.fixedCostsPeriodNote}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        Сумма пунктов на вкладке{" "}
                        <button
                          type="button"
                          className="text-[var(--sidebar-blue)] hover:underline"
                          onClick={() => setTab("fixedCosts")}
                        >
                          «Постоянные расходы»
                        </button>
                        . Период поясните там же или во вкладке «Версия и профили».
                      </p>
                    )}
                    {fixedPerExpectedWork != null && editor.version.expectedWorksPerMonth ? (
                      <p className="mt-2 font-mono text-sm text-[var(--text-secondary)]">
                        {fmtNum(fixedCostsRub)} / {fmtNum(editor.version.expectedWorksPerMonth)} ={" "}
                        {fmtNum(fixedPerExpectedWork)} ₽ на работу (по ожидаемой нагрузке)
                      </p>
                    ) : null}
                    {fixedPerAvgWork != null ? (
                      <p className="mt-2 font-mono text-sm text-[var(--text-secondary)]">
                        {fmtNum(fixedCostsRub)} / {fmtNum(editor.workload.avgWorksPerMonth)} ={" "}
                        {fmtNum(fixedPerAvgWork)} ₽ на работу (по среднему из CRM)
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                    <dt className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                      Чистая прибыль (оценка)
                    </dt>
                    <dd className="mt-2 font-mono text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-100">
                      {fmtNum(netProfitVsFixed)} ₽
                    </dd>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">Выручка − постоянные</p>
                  </div>
                </dl>
              </div>
            </section>
          ) : null}

          {tab === "columns" ? (
            <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
              <h2 className="text-base font-semibold text-[var(--app-text)]">Колонки и формулы</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Порядок — sortOrder. Функции: <code className="text-xs">sum</code>,{" "}
                <code className="text-xs">min</code>, <code className="text-xs">max</code>. Общие пулы
                подставляются как <code className="text-xs">sh_ключ</code>.
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-[48rem] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--card-border)] text-xs uppercase text-[var(--text-muted)]">
                      <th className="py-2 pr-2">sort</th>
                      <th className="py-2 pr-2">key</th>
                      <th className="py-2 pr-2">Подпись</th>
                      <th className="py-2 pr-2">Тип</th>
                      <th className="py-2 pr-2">Формула</th>
                      <th className="py-2 pr-2">Подсказка</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colDraft.map((c, idx) => (
                      <tr key={c.id} className="border-b border-[var(--card-border)] align-top">
                        <td className="py-2 pr-2">
                          <input
                            className="w-16 rounded border border-[var(--card-border)] bg-[var(--surface-muted)] px-1 py-0.5"
                            type="number"
                            value={c.sortOrder}
                            onChange={(e) => {
                              const n = Number.parseInt(e.target.value, 10);
                              setColDraft((rows) =>
                                rows.map((r, i) =>
                                  i === idx ? { ...r, sortOrder: Number.isFinite(n) ? n : 0 } : r,
                                ),
                              );
                            }}
                          />
                        </td>
                        <td className="py-2 pr-2 font-mono text-xs">{c.key}</td>
                        <td className="py-2 pr-2">
                          <input
                            className="w-full min-w-[10rem] rounded border border-[var(--card-border)] bg-[var(--surface-muted)] px-1 py-0.5"
                            value={c.label}
                            onChange={(e) =>
                              setColDraft((rows) =>
                                rows.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r)),
                              )
                            }
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <select
                            className="rounded border border-[var(--card-border)] bg-[var(--surface-muted)] px-1 py-0.5"
                            value={c.kind}
                            onChange={(e) =>
                              setColDraft((rows) =>
                                rows.map((r, i) =>
                                  i === idx
                                    ? {
                                        ...r,
                                        kind: e.target.value as CostingColumnKind,
                                        formula: e.target.value === "COMPUTED" ? r.formula : null,
                                      }
                                    : r,
                                ),
                              )
                            }
                          >
                            <option value="INPUT">INPUT</option>
                            <option value="COMPUTED">COMPUTED</option>
                          </select>
                        </td>
                        <td className="py-2 pr-2">
                          {c.kind === "COMPUTED" ? (
                            <textarea
                              className="h-16 w-full min-w-[14rem] rounded border border-[var(--card-border)] bg-[var(--surface-muted)] px-1 py-0.5 font-mono text-xs"
                              value={c.formula ?? ""}
                              onChange={(e) =>
                                setColDraft((rows) =>
                                  rows.map((r, i) =>
                                    i === idx ? { ...r, formula: e.target.value } : r,
                                  ),
                                )
                              }
                            />
                          ) : (
                            <span className="text-[var(--text-muted)]">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            className="w-full min-w-[8rem] rounded border border-[var(--card-border)] bg-[var(--surface-muted)] px-1 py-0.5 text-xs"
                            value={c.hint ?? ""}
                            onChange={(e) =>
                              setColDraft((rows) =>
                                rows.map((r, i) =>
                                  i === idx ? { ...r, hint: e.target.value || null } : r,
                                ),
                              )
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                disabled={saving || colDraft.length === 0}
                onClick={() => void saveColumns()}
                className="mt-3 rounded-lg bg-[var(--sidebar-blue)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                Сохранить колонки
              </button>
            </section>
          ) : null}

          {tab === "pools" ? (
            <section className="space-y-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
              <h2 className="text-base font-semibold text-[var(--app-text)]">Общие затраты</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Пул — одна сумма на версию (например аренда). В таблице у каждой строки вводится своя доля в ₽;
                по позициям доли независимы (где не относится — 0). В формулах колонок используйте переменную{" "}
                <code className="text-xs">sh_ваш_ключ</code> — для строки подставится её доля.
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <input
                  placeholder="ключ (лат.)"
                  value={newPoolKey}
                  onChange={(e) => setNewPoolKey(e.target.value)}
                  className="rounded-md border border-[var(--card-border)] px-2 py-1.5 font-mono text-sm"
                />
                <input
                  placeholder="Подпись"
                  value={newPoolLabel}
                  onChange={(e) => setNewPoolLabel(e.target.value)}
                  className="min-w-[10rem] rounded-md border border-[var(--card-border)] px-2 py-1.5 text-sm"
                />
                <input
                  placeholder="Всего ₽ (ориентир)"
                  value={newPoolTotal}
                  onChange={(e) => setNewPoolTotal(e.target.value)}
                  className="w-36 rounded-md border border-[var(--card-border)] px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void addSharedPool()}
                  className="rounded-lg bg-[var(--sidebar-blue)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  Добавить пул
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[32rem] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[var(--card-border)] text-left text-xs uppercase text-[var(--text-muted)]">
                      <th className="py-2 pr-3">Ключ</th>
                      <th className="py-2 pr-3">Подпись</th>
                      <th className="py-2 pr-3">Всего ₽</th>
                      <th className="py-2 pr-3">Σ долей в таблице</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {editor.sharedPools.map((p) => {
                      const sumCol = poolColumnSums[p.id] ?? 0;
                      const drift = p.totalRub > 0 && Math.abs(sumCol - p.totalRub) > 0.01;
                      return (
                        <tr key={p.id} className="border-b border-[var(--card-border)]">
                          <td className="py-2 pr-3 font-mono text-xs">sh_{p.key}</td>
                          <td className="py-2 pr-3">{p.label}</td>
                          <td className="py-2 pr-3 font-mono">{fmtNum(p.totalRub)}</td>
                          <td className={`py-2 pr-3 font-mono ${drift ? "text-amber-800" : ""}`}>
                            {fmtNum(sumCol)}
                          </td>
                          <td className="py-2">
                            <button
                              type="button"
                              className="text-sm text-red-700 hover:underline"
                              onClick={() => void deletePool(p.id)}
                            >
                              Удалить
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {tab === "fixedCosts" ? (
            <section className="space-y-5 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
              <div>
                <h2 className="text-base font-semibold text-[var(--app-text)]">Постоянные расходы</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Добавьте статьи (аренда, оклады, коммуналка…). Сумма строк автоматически подставляется в блок «Чистая
                  прибыль» на вкладке «Таблица». Ниже — нагрузка: сколько работ в месяц вы закладываете и сколько в
                  среднем было по нарядам CRM.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)]/50 p-4">
                  <h3 className="text-sm font-semibold text-[var(--app-text)]">Нагрузка (работ / месяц)</h3>
                  <label className="mt-3 block text-sm">
                    <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                      Ожидаемое количество работ в месяц
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      className="mt-1 w-full max-w-xs rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-2 font-mono text-base"
                      value={
                        editor.version.expectedWorksPerMonth != null
                          ? editor.version.expectedWorksPerMonth
                          : ""
                      }
                      onChange={(e) => {
                        const raw = e.target.value;
                        setEditor((ed) =>
                          ed
                            ? {
                                ...ed,
                                version: {
                                  ...ed.version,
                                  expectedWorksPerMonth:
                                    raw === ""
                                      ? null
                                      : (() => {
                                          const n = Number.parseFloat(raw.replace(",", "."));
                                          return Number.isFinite(n) ? Math.max(0, n) : ed.version.expectedWorksPerMonth;
                                        })(),
                                },
                              }
                            : ed,
                        );
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveExpectedWorkload()}
                    className="mt-3 rounded-lg bg-[var(--sidebar-blue)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Сохранить ожидаемую нагрузку
                  </button>
                </div>
                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)]/50 p-4">
                  <h3 className="text-sm font-semibold text-[var(--app-text)]">Авто из CRM</h3>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {editor.workload.periodLabel}: создано нарядов —{" "}
                    <span className="font-mono font-semibold text-[var(--app-text)]">
                      {fmtNum(editor.workload.ordersInPeriod)}
                    </span>
                    .
                  </p>
                  <p className="mt-2 text-base text-[var(--app-text)]">
                    Среднее в месяц:{" "}
                    <span className="font-mono font-semibold">{fmtNum(editor.workload.avgWorksPerMonth)}</span>{" "}
                    <span className="text-sm text-[var(--text-secondary)]">(деление количества на 12)</span>
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)]/40 px-4 py-3 text-sm">
                <p className="font-medium text-[var(--app-text)]">
                  Σ постоянных: <span className="font-mono">{fmtNum(fixedCostsRub)}</span> ₽
                </p>
                {editor.version.expectedWorksPerMonth != null &&
                editor.version.expectedWorksPerMonth > 0 &&
                fixedPerExpectedWork != null ? (
                  <p className="mt-2 font-mono text-[var(--text-secondary)]">
                    {fmtNum(fixedCostsRub)} / {fmtNum(editor.version.expectedWorksPerMonth)} ={" "}
                    {fmtNum(fixedPerExpectedWork)} ₽ на работу (ожидаемая нагрузка)
                  </p>
                ) : (
                  <p className="mt-2 text-[var(--text-secondary)]">
                    Укажите ожидаемое число работ и сохраните — появится деление Σ / ожидание.
                  </p>
                )}
                {editor.workload.avgWorksPerMonth > 0 && fixedPerAvgWork != null ? (
                  <p className="mt-2 font-mono text-[var(--text-secondary)]">
                    {fmtNum(fixedCostsRub)} / {fmtNum(editor.workload.avgWorksPerMonth)} ={" "}
                    {fmtNum(fixedPerAvgWork)} ₽ на работу (среднее из CRM)
                  </p>
                ) : (
                  <p className="mt-2 text-[var(--text-secondary)]">
                    Нет данных по нарядам за период — среднее в месяц = 0, деление не считается.
                  </p>
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[var(--app-text)]">Статьи</h3>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void addFixedCostItem()}
                    className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm font-medium hover:border-[var(--sidebar-blue)] disabled:opacity-50"
                  >
                    Добавить пункт
                  </button>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-[28rem] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[var(--card-border)] text-left text-xs uppercase text-[var(--text-muted)]">
                        <th className="py-2 pr-3">Название</th>
                        <th className="py-2 pr-3">Сумма, ₽</th>
                        <th className="py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {editor.fixedCostItems.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-4 text-[var(--text-secondary)]">
                            Пока нет пунктов — нажмите «Добавить пункт».
                          </td>
                        </tr>
                      ) : (
                        editor.fixedCostItems.map((it) => (
                          <tr key={it.id} className="border-b border-[var(--card-border)]">
                            <td className="py-2 pr-3">
                              <input
                                className="w-full min-w-[12rem] rounded-md border border-[var(--card-border)] bg-[var(--surface-muted)] px-2 py-1.5"
                                defaultValue={it.label}
                                key={`fl-${it.id}-${it.label}`}
                                onBlur={(e) => {
                                  const label = e.target.value.trim() || "Статья";
                                  if (label !== it.label) void patchFixedCostItem(it.id, { label });
                                }}
                              />
                            </td>
                            <td className="py-2 pr-3">
                              <input
                                type="number"
                                min={0}
                                className="w-32 rounded-md border border-[var(--card-border)] bg-[var(--surface-muted)] px-2 py-1.5 font-mono"
                                defaultValue={it.amountRub}
                                key={`fa-${it.id}-${it.amountRub}`}
                                onBlur={(e) => {
                                  const n = Number.parseFloat(e.target.value.replace(",", "."));
                                  const amountRub = Number.isFinite(n) ? Math.max(0, n) : 0;
                                  if (amountRub !== it.amountRub) void patchFixedCostItem(it.id, { amountRub });
                                }}
                              />
                            </td>
                            <td className="py-2">
                              <button
                                type="button"
                                className="text-sm text-red-700 hover:underline"
                                onClick={() => void deleteFixedCostItem(it.id)}
                              >
                                Удалить
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : null}

          {tab === "profiles" ? (
            <section className="space-y-6">
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
                <h2 className="text-base font-semibold text-[var(--app-text)]">Свойства версии</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="text-sm">
                    <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                      Название
                    </span>
                    <input
                      value={editor.version.title}
                      onChange={(e) =>
                        setEditor((ed) =>
                          ed ? { ...ed, version: { ...ed.version, title: e.target.value } } : ed,
                        )
                      }
                      className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-[var(--surface-muted)] px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                      Действует с
                    </span>
                    <input
                      type="date"
                      value={
                        editor.version.effectiveFrom
                          ? editor.version.effectiveFrom.slice(0, 10)
                          : ""
                      }
                      onChange={(e) =>
                        setEditor((ed) =>
                          ed
                            ? {
                                ...ed,
                                version: {
                                  ...ed.version,
                                  effectiveFrom: e.target.value
                                    ? new Date(e.target.value + "T12:00:00.000Z").toISOString()
                                    : null,
                                },
                              }
                            : ed,
                        )
                      }
                      className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-[var(--surface-muted)] px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editor.version.archived}
                      onChange={(e) =>
                        setEditor((ed) =>
                          ed
                            ? { ...ed, version: { ...ed.version, archived: e.target.checked } }
                            : ed,
                        )
                      }
                    />
                    В архиве
                  </label>
                  <div className="text-sm sm:col-span-2 lg:col-span-3">
                    <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                      Постоянные расходы (сумма)
                    </span>
                    <p className="mt-1 text-base font-mono font-semibold text-[var(--app-text)]">
                      {fmtNum(fixedCostsRub)} ₽
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Редактируются списком во вкладке{" "}
                      <button
                        type="button"
                        className="text-[var(--sidebar-blue)] hover:underline"
                        onClick={() => setTab("fixedCosts")}
                      >
                        «Постоянные расходы»
                      </button>
                      .
                    </p>
                  </div>
                  <label className="text-sm sm:col-span-2 lg:col-span-3">
                    <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                      К какому периоду относятся постоянные расходы и сумма «цена клиенту» в таблице
                    </span>
                    <textarea
                      rows={2}
                      className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-[var(--surface-muted)] px-2 py-1.5 text-sm"
                      placeholder="Например: за календарный месяц; таблица — план продаж на тот же месяц"
                      value={editor.version.fixedCostsPeriodNote ?? ""}
                      onChange={(e) =>
                        setEditor((ed) =>
                          ed
                            ? {
                                ...ed,
                                version: {
                                  ...ed.version,
                                  fixedCostsPeriodNote: e.target.value.trim() || null,
                                },
                              }
                            : ed,
                        )
                      }
                    />
                  </label>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveVersionMeta()}
                  className="mt-3 rounded-lg bg-[var(--sidebar-blue)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  Сохранить
                </button>
              </div>

              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
                <h2 className="text-base font-semibold text-[var(--app-text)]">Профили клиента</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {editor.profiles.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-baseline justify-between gap-2 rounded border border-[var(--card-border)] px-3 py-2"
                    >
                      <span>
                        <strong>{p.name}</strong> — {p.listDiscountPercent}%
                        {p.clinic ? ` · ${p.clinic.name}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap items-end gap-2">
                  <input
                    placeholder="Название профиля"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    className="rounded-md border border-[var(--card-border)] bg-[var(--surface-muted)] px-2 py-1.5 text-sm"
                  />
                  <label className="text-sm">
                    <span className="block text-xs text-[var(--text-muted)]">Скидка %</span>
                    <input
                      type="number"
                      value={newProfileDiscount}
                      onChange={(e) => setNewProfileDiscount(e.target.value)}
                      className="w-24 rounded-md border border-[var(--card-border)] px-2 py-1.5 text-sm"
                    />
                  </label>
                  <select
                    value={newProfileClinicId}
                    onChange={(e) => setNewProfileClinicId(e.target.value)}
                    className="rounded-md border border-[var(--card-border)] px-2 py-1.5 text-sm"
                  >
                    <option value="">Клиника</option>
                    {clinics.map((c) => (
                      <option key={c.id} value={c.id}>
                        {clinicSelectLabel(c)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void addProfile()}
                    className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm font-medium hover:border-[var(--sidebar-blue)] disabled:opacity-50"
                  >
                    Добавить профиль
                  </button>
                </div>
              </div>
            </section>
          ) : null}
        </>
      ) : versionId ? (
        <p className="text-sm text-[var(--text-secondary)]">Загрузка…</p>
      ) : (
        <p className="text-sm text-[var(--text-secondary)]">Выберите версию или создайте шаблон.</p>
      )}
    </div>
  );
}
