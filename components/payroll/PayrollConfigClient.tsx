"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { payrollConfigMatchesQuery } from "@/lib/payroll-staff-roles";
import { PayrollImportExportPanel } from "@/components/payroll/PayrollImportExportPanel";

type PriceItem = {
  id: string;
  code: string;
  name: string;
  sectionTitle: string | null;
  subsectionTitle: string | null;
};

type StaffRole = {
  id: string;
  name: string;
  sortOrder: number;
};

type ConfigRow = {
  id: string;
  name: string;
  amountRub: number;
  staffRoleIds: string[];
  staffRoles: { id: string; name: string }[];
  priceListItemIds: string[];
  priceItems: {
    id: string;
    code: string;
    name: string;
    sectionTitle?: string | null;
    subsectionTitle?: string | null;
  }[];
};

type FotDraft = {
  id?: string;
  name: string;
  amountRub: string;
  staffRoleIds: string[];
  priceListItemIds: string[];
};

const CARD_WIDTH = 221;
const CARD_HEIGHT = 312;

const ROLE_ACCENTS = [
  "#0ea5e9",
  "#f59e0b",
  "#8b5cf6",
  "#10b981",
  "#f43f5e",
  "#64748b",
  "#06b6d4",
  "#eab308",
];

const emptyDraft = (preselectRoleId?: string | null): FotDraft => ({
  name: "",
  amountRub: "",
  staffRoleIds: preselectRoleId ? [preselectRoleId] : [],
  priceListItemIds: [],
});

function parseRubText(value: string): number | null {
  const text = value.replace(/\s/g, "").trim();
  if (!text) return null;
  const n = Number.parseInt(text, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

function draftFromRow(row: ConfigRow): FotDraft {
  return {
    id: row.id,
    name: row.name,
    amountRub: String(row.amountRub),
    staffRoleIds: [...row.staffRoleIds],
    priceListItemIds: [...row.priceListItemIds],
  };
}

function configsForRole(
  configs: ConfigRow[],
  roleId: string | null,
): ConfigRow[] {
  if (roleId == null) {
    return configs.filter((c) => c.staffRoleIds.length === 0);
  }
  return configs.filter((c) => c.staffRoleIds.includes(roleId));
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-zinc-900/45 p-3 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={`flex max-h-[min(92dvh,880px)] w-full flex-col overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl ${
          wide ? "max-w-[min(96vw,44rem)]" : "max-w-lg"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--card-border)] px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-[var(--text-strong)]">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-sm text-[var(--text-muted)]">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--input-border)] px-2.5 py-1 text-sm text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function RoleCard({
  title,
  accent,
  fotCount,
  subtitle,
  onOpen,
  onDelete,
  canConfigure,
}: {
  title: string;
  accent: string;
  fotCount: number;
  subtitle: string;
  onOpen: () => void;
  onDelete?: () => void;
  canConfigure: boolean;
}) {
  return (
    <div
      className="relative shrink-0 rounded-[9px] p-[2px] ring-1 ring-[var(--card-border)]"
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
    >
      <article
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        className="flex h-full min-h-0 cursor-pointer flex-col overflow-hidden rounded-[7px] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:border-[color-mix(in_srgb,var(--sidebar-blue)_35%,var(--card-border))] hover:shadow-[0_4px_14px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
      >
        <div
          className="flex items-center justify-between gap-2 px-3 pb-2 pt-3"
          style={{ borderTop: `4px solid ${accent}` }}
        >
          <span
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: accent }}
          >
            Роль
          </span>
          {canConfigure && onDelete ? (
            <button
              type="button"
              aria-label={`Удалить роль ${title}`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="rounded-md border border-red-300 px-2 py-0.5 text-[10px] font-medium text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30"
            >
              Удалить
            </button>
          ) : null}
        </div>
        <div className="flex min-h-0 flex-1 flex-col px-3 pb-3">
          <h3
            className="line-clamp-3 font-semibold leading-snug text-[var(--text-strong)]"
            style={{ fontSize: 15 }}
          >
            {title}
          </h3>
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">{subtitle}</p>
          <div className="mt-auto space-y-1 border-t border-[var(--card-border)] pt-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] text-[var(--text-muted)]">ФОТ</span>
              <span
                className="font-semibold tabular-nums text-[var(--text-strong)]"
                style={{ fontSize: 15 }}
              >
                {fotCount}
              </span>
            </div>
            <p className="text-[11px] text-[var(--sidebar-blue)]">Открыть список →</p>
          </div>
        </div>
      </article>
    </div>
  );
}

export function PayrollConfigClient() {
  const [priceItems, setPriceItems] = useState<PriceItem[]>([]);
  const [staffRoles, setStaffRoles] = useState<StaffRole[]>([]);
  const [configs, setConfigs] = useState<ConfigRow[]>([]);
  const [canConfigure, setCanConfigure] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [openRoleId, setOpenRoleId] = useState<string | null | undefined>(
    undefined,
  );
  const [draft, setDraft] = useState<FotDraft | null>(null);
  const [roleNameDraft, setRoleNameDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pricePickQuery, setPricePickQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payroll/config", { cache: "no-store" });
      const data = (await res.json()) as {
        priceItems?: PriceItem[];
        staffRoles?: StaffRole[];
        configs?: ConfigRow[];
        canConfigure?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Не удалось загрузить ФОТ");
      setPriceItems(Array.isArray(data.priceItems) ? data.priceItems : []);
      setStaffRoles(Array.isArray(data.staffRoles) ? data.staffRoles : []);
      setConfigs(Array.isArray(data.configs) ? data.configs : []);
      setCanConfigure(Boolean(data.canConfigure));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const matchedConfigs = useMemo(
    () => configs.filter((c) => payrollConfigMatchesQuery(c, query)),
    [configs, query],
  );

  const commonCount = useMemo(
    () => configsForRole(matchedConfigs, null).length,
    [matchedConfigs],
  );

  const openRoleConfigs = useMemo(() => {
    if (openRoleId === undefined) return [];
    return configsForRole(matchedConfigs, openRoleId);
  }, [matchedConfigs, openRoleId]);

  const openRoleTitle =
    openRoleId === null
      ? "Общие"
      : staffRoles.find((r) => r.id === openRoleId)?.name ?? "Роль";

  const filteredPricePick = useMemo(() => {
    const q = pricePickQuery.trim().toLowerCase();
    if (!q) return priceItems.slice(0, 60);
    return priceItems
      .filter(
        (p) =>
          p.code.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          (p.sectionTitle ?? "").toLowerCase().includes(q),
      )
      .slice(0, 60);
  }, [priceItems, pricePickQuery]);

  const inputCls =
    "w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--sidebar-blue)]";

  const saveFot = async () => {
    if (!draft || !canConfigure) return;
    const amountRub = parseRubText(draft.amountRub);
    const name = draft.name.trim();
    if (!name || !amountRub) {
      setError("Укажите название и сумму");
      return;
    }
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const res = await fetch("/api/payroll/config", {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draft.id,
          name,
          amountRub,
          staffRoleIds: draft.staffRoleIds,
          priceListItemIds: draft.priceListItemIds,
        }),
      });
      const data = (await res.json()) as { config?: ConfigRow; error?: string };
      if (!res.ok || !data.config) {
        throw new Error(data.error || "Не удалось сохранить");
      }
      setConfigs((prev) =>
        draft.id
          ? prev.map((c) => (c.id === data.config!.id ? data.config! : c))
          : [data.config!, ...prev],
      );
      setDraft(null);
      setPricePickQuery("");
      setOkMsg(draft.id ? "ФОТ обновлён" : "ФОТ создан");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const deleteFot = async (row: ConfigRow) => {
    if (!canConfigure) return;
    if (!window.confirm(`Удалить ФОТ «${row.name}»?`)) return;
    setDeletingId(row.id);
    setError(null);
    setOkMsg(null);
    try {
      const res = await fetch("/api/payroll/config", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Не удалось удалить");
      setConfigs((prev) => prev.filter((c) => c.id !== row.id));
      if (draft?.id === row.id) setDraft(null);
      setOkMsg("ФОТ удалён");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка удаления");
    } finally {
      setDeletingId(null);
    }
  };

  const createRole = async () => {
    if (!canConfigure || roleNameDraft == null) return;
    const name = roleNameDraft.trim();
    if (!name) {
      setError("Укажите название роли");
      return;
    }
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const res = await fetch("/api/payroll/staff-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json()) as {
        role?: StaffRole;
        error?: string;
      };
      if (!res.ok || !data.role) {
        throw new Error(data.error || "Не удалось создать роль");
      }
      setStaffRoles((prev) =>
        [...prev, data.role!].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "ru"),
        ),
      );
      setRoleNameDraft(null);
      setOkMsg(`Роль «${data.role.name}» создана`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка создания роли");
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async (role: StaffRole) => {
    if (!canConfigure) return;
    if (
      !window.confirm(
        `Удалить роль «${role.name}»? Связи с ФОТ будут сняты.`,
      )
    ) {
      return;
    }
    setError(null);
    setOkMsg(null);
    try {
      const res = await fetch("/api/payroll/staff-roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: role.id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Не удалось удалить роль");
      setStaffRoles((prev) => prev.filter((r) => r.id !== role.id));
      setConfigs((prev) =>
        prev.map((c) => ({
          ...c,
          staffRoleIds: c.staffRoleIds.filter((id) => id !== role.id),
          staffRoles: c.staffRoles.filter((s) => s.id !== role.id),
        })),
      );
      if (openRoleId === role.id) setOpenRoleId(undefined);
      setOkMsg(`Роль «${role.name}» удалена`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка удаления роли");
    }
  };

  const toggleDraftRole = (roleId: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const has = prev.staffRoleIds.includes(roleId);
      return {
        ...prev,
        staffRoleIds: has
          ? prev.staffRoleIds.filter((id) => id !== roleId)
          : [...prev.staffRoleIds, roleId],
      };
    });
  };

  const toggleDraftPrice = (priceId: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const has = prev.priceListItemIds.includes(priceId);
      return {
        ...prev,
        priceListItemIds: has
          ? prev.priceListItemIds.filter((id) => id !== priceId)
          : [...prev.priceListItemIds, priceId],
      };
    });
  };

  if (loading) {
    return <p className="text-sm text-[var(--text-muted)]">Загрузка ФОТ…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск: название, код/имя прайса, сумма"
          className="min-w-[260px] flex-1 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--sidebar-blue)]"
        />
        {canConfigure ? (
          <>
            <button
              type="button"
              onClick={() => {
                setDraft(emptyDraft(null));
                setPricePickQuery("");
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--sidebar-blue)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              <PlusIcon className="h-4 w-4" />
              ФОТ
            </button>
            <button
              type="button"
              onClick={() => setRoleNameDraft("")}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
            >
              <PlusIcon className="h-4 w-4" />
              Роль
            </button>
          </>
        ) : null}
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
        >
          Обновить
        </button>
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-600 dark:text-red-300">
          {error}
        </p>
      ) : null}
      {okMsg ? (
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          {okMsg}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-4">
        <RoleCard
          title="Общие"
          accent="#64748b"
          fotCount={commonCount}
          subtitle="ФОТ без привязки к роли"
          canConfigure={canConfigure}
          onOpen={() => setOpenRoleId(null)}
        />
        {staffRoles.map((role, i) => (
          <RoleCard
            key={role.id}
            title={role.name}
            accent={ROLE_ACCENTS[i % ROLE_ACCENTS.length]!}
            fotCount={configsForRole(matchedConfigs, role.id).length}
            subtitle="Роль сотрудника"
            canConfigure={canConfigure}
            onOpen={() => setOpenRoleId(role.id)}
            onDelete={() => void deleteRole(role)}
          />
        ))}
      </div>

      {canConfigure ? (
        <PayrollImportExportPanel
          staffRoles={staffRoles}
          priceItems={priceItems}
          onApplied={() => void load()}
        />
      ) : null}

      {openRoleId !== undefined ? (
        <ModalShell
          title={`ФОТ · ${openRoleTitle}`}
          subtitle={
            query.trim()
              ? `С учётом поиска: ${openRoleConfigs.length}`
              : `${openRoleConfigs.length} позиций`
          }
          onClose={() => setOpenRoleId(undefined)}
          wide
        >
          <div className="space-y-3">
            {canConfigure ? (
              <button
                type="button"
                onClick={() => {
                  setDraft(
                    emptyDraft(openRoleId === null ? null : openRoleId),
                  );
                  setPricePickQuery("");
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-[var(--sidebar-blue)] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
              >
                <PlusIcon className="h-4 w-4" />
                Добавить ФОТ
              </button>
            ) : null}

            {openRoleConfigs.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--text-muted)]">
                Нет ФОТ для этой карточки
                {query.trim() ? " по текущему поиску" : ""}.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--card-border)] rounded-xl border border-[var(--card-border)]">
                {openRoleConfigs.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-start justify-between gap-3 px-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[var(--text-strong)]">
                        {row.name}
                      </div>
                      <div className="mt-0.5 text-sm tabular-nums text-[var(--text-strong)]">
                        {row.amountRub.toLocaleString("ru-RU")} ₽
                      </div>
                      {row.staffRoles.length > 0 ? (
                        <div className="mt-1 text-xs text-[var(--text-muted)]">
                          Роли: {row.staffRoles.map((s) => s.name).join(", ")}
                        </div>
                      ) : (
                        <div className="mt-1 text-xs text-[var(--text-muted)]">
                          Общий ФОТ
                        </div>
                      )}
                      {row.priceItems.length > 0 ? (
                        <div className="mt-1 text-xs text-[var(--text-muted)]">
                          Прайс:{" "}
                          {row.priceItems
                            .map((p) => `${p.code} · ${p.name}`)
                            .join("; ")}
                        </div>
                      ) : null}
                    </div>
                    {canConfigure ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          aria-label={`Изменить ${row.name}`}
                          onClick={() => {
                            setDraft(draftFromRow(row));
                            setPricePickQuery("");
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--input-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                          Изменить
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === row.id}
                          onClick={() => void deleteFot(row)}
                          className="rounded-md border border-red-300 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30"
                        >
                          {deletingId === row.id ? "Удал…" : "Удалить"}
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </ModalShell>
      ) : null}

      {draft ? (
        <ModalShell
          title={draft.id ? "Редактировать ФОТ" : "Новый ФОТ"}
          onClose={() => {
            setDraft(null);
            setPricePickQuery("");
          }}
          wide
        >
          <div className="space-y-4">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[var(--text-muted)]">
                Название
              </span>
              <input
                className={inputCls}
                value={draft.name}
                onChange={(e) =>
                  setDraft((prev) =>
                    prev ? { ...prev, name: e.target.value } : prev,
                  )
                }
                placeholder="Название плашки"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-[var(--text-muted)]">
                Сумма, ₽
              </span>
              <input
                className={inputCls}
                inputMode="numeric"
                value={draft.amountRub}
                onChange={(e) =>
                  setDraft((prev) =>
                    prev ? { ...prev, amountRub: e.target.value } : prev,
                  )
                }
                placeholder="Например 1500"
              />
            </label>

            <fieldset className="space-y-2">
              <legend className="text-xs font-medium text-[var(--text-muted)]">
                Роли сотрудников (0 = общий ФОТ)
              </legend>
              {staffRoles.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Ролей пока нет — ФОТ будет общим.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5 rounded-lg border border-[var(--card-border)] p-3">
                  {staffRoles.map((role) => (
                    <label
                      key={role.id}
                      className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-strong)]"
                    >
                      <input
                        type="checkbox"
                        checked={draft.staffRoleIds.includes(role.id)}
                        onChange={() => toggleDraftRole(role.id)}
                        className="h-4 w-4 rounded border-[var(--input-border)]"
                      />
                      {role.name}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-xs font-medium text-[var(--text-muted)]">
                Позиции прайса (необязательно)
              </legend>
              <input
                className={inputCls}
                value={pricePickQuery}
                onChange={(e) => setPricePickQuery(e.target.value)}
                placeholder="Поиск по коду или названию…"
              />
              <div className="max-h-48 overflow-y-auto rounded-lg border border-[var(--card-border)] p-2">
                {filteredPricePick.length === 0 ? (
                  <p className="px-1 py-2 text-sm text-[var(--text-muted)]">
                    Ничего не найдено
                  </p>
                ) : (
                  filteredPricePick.map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1.5 text-sm text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
                    >
                      <input
                        type="checkbox"
                        checked={draft.priceListItemIds.includes(p.id)}
                        onChange={() => toggleDraftPrice(p.id)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--input-border)]"
                      />
                      <span>
                        <span className="font-medium">
                          {p.code} · {p.name}
                        </span>
                        {p.sectionTitle ? (
                          <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                            {[p.sectionTitle, p.subsectionTitle]
                              .filter(Boolean)
                              .join(" / ")}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))
                )}
              </div>
              {draft.priceListItemIds.length > 0 ? (
                <p className="text-xs text-[var(--text-muted)]">
                  Выбрано позиций: {draft.priceListItemIds.length}
                </p>
              ) : null}
            </fieldset>

            <div className="flex flex-wrap gap-2 border-t border-[var(--card-border)] pt-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveFot()}
                className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Сохранение…" : "Сохранить"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(null);
                  setPricePickQuery("");
                }}
                className="rounded-md border border-[var(--input-border)] px-3 py-2 text-sm font-medium text-[var(--text-strong)]"
              >
                Отмена
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {roleNameDraft != null ? (
        <ModalShell
          title="Новая роль сотрудника"
          onClose={() => setRoleNameDraft(null)}
        >
          <div className="space-y-4">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[var(--text-muted)]">
                Название
              </span>
              <input
                className={inputCls}
                value={roleNameDraft}
                onChange={(e) => setRoleNameDraft(e.target.value)}
                placeholder="Например Цифра"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void createRole();
                  }
                }}
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void createRole()}
                className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Создание…" : "Создать"}
              </button>
              <button
                type="button"
                onClick={() => setRoleNameDraft(null)}
                className="rounded-md border border-[var(--input-border)] px-3 py-2 text-sm font-medium text-[var(--text-strong)]"
              >
                Отмена
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}
