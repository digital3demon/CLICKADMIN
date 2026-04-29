"use client";

import {
  buildClientsListUrl,
  CLINIC_ORDER_OPTIONS,
  clientsListStateFromSearchParams,
  clinicOrderSelectValue,
  parseClinicDir,
  parseClinicOrderSelectValue,
  parseClinicSort,
} from "@/lib/clients-list-search";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const OPTION_VALUES = new Set(CLINIC_ORDER_OPTIONS.map((o) => o.value));

const selectClass =
  "min-w-[min(100%,280px)] rounded-lg border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--app-text)] shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";

type Props = {
  initialValue: string;
};

export function ClientsClinicSortSelect({ initialValue }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const sort = parseClinicSort(sp.get("clinicSort"));
    const dir = parseClinicDir(sort, sp.get("clinicDir"));
    setValue(clinicOrderSelectValue(sort, dir));
  }, [sp]);

  const selectValue = useMemo(
    () => (OPTION_VALUES.has(value) ? value : "name:asc"),
    [value],
  );

  return (
    <div className="flex min-w-[200px] flex-col gap-1">
      <label
        htmlFor="clients-clinic-sort"
        className="text-xs font-medium text-[var(--text-secondary)]"
      >
        Сортировка
      </label>
      <select
        id="clients-clinic-sort"
        className={selectClass}
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value;
          if (!OPTION_VALUES.has(v)) return;
          setValue(v);
          const parsed = parseClinicOrderSelectValue(v);
          if (!parsed) return;
          const base = clientsListStateFromSearchParams(sp, "clinic");
          router.replace(
            buildClientsListUrl({
              ...base,
              view: "clinic",
              clinicSort: parsed.clinicSort,
              clinicDir: parsed.clinicDir,
              clinicPage: 1,
            }),
            { scroll: false },
          );
        }}
      >
        {CLINIC_ORDER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
