"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  compactCrmModuleListRows,
  crmModuleListKeepAlivePath,
  crmModuleListSnapshotKey,
  writeCrmModuleListSnapshot,
  type CrmModuleListSnapshotRow,
} from "@/lib/crm-module-list-snapshot";
import { markCrmListAlive } from "@/lib/crm-module-list-alive";
import { useCrmModuleListLive } from "@/components/layout/CrmModuleListLive";

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
  const live = useCrmModuleListLive();
  const serialized = useMemo(
    () => JSON.stringify(compactCrmModuleListRows(rows)),
    [rows],
  );

  useLayoutEffect(() => {
    const listPath = crmModuleListKeepAlivePath(pathname ?? "");
    if (live && listPath) markCrmListAlive(listPath);
  }, [live, pathname]);

  useEffect(() => {
    const key = crmModuleListSnapshotKey(pathname ?? "", searchParams.toString());
    writeCrmModuleListSnapshot(
      key,
      JSON.parse(serialized) as CrmModuleListSnapshotRow[],
    );
  }, [pathname, searchParams, serialized]);

  return null;
}
