"use client";

import { Suspense, useEffect, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  compactCrmModuleListRows,
  crmModuleListSnapshotKey,
  writeCrmModuleListSnapshot,
  type CrmModuleListSnapshotRow,
} from "@/lib/crm-module-list-snapshot";

export function CrmModuleListSnapshotWriter({
  rows,
}: {
  rows: readonly Partial<CrmModuleListSnapshotRow>[];
}) {
  return (
    <Suspense fallback={null}>
      <CrmModuleListSnapshotWriterInner rows={rows} />
    </Suspense>
  );
}

function CrmModuleListSnapshotWriterInner({
  rows,
}: {
  rows: readonly Partial<CrmModuleListSnapshotRow>[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const serialized = useMemo(
    () => JSON.stringify(compactCrmModuleListRows(rows)),
    [rows],
  );

  useEffect(() => {
    const key = crmModuleListSnapshotKey(pathname ?? "", searchParams.toString());
    writeCrmModuleListSnapshot(key, JSON.parse(serialized) as CrmModuleListSnapshotRow[]);
  }, [pathname, searchParams, serialized]);

  return null;
}
