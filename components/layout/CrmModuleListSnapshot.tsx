"use client";

import { CrmModuleListLoading } from "@/components/layout/CrmModuleListLoading";

/** Совместимость: тот же клиентский маркер, что loading.tsx. */
export function CrmModuleListSnapshot({ title }: { title: string }) {
  return <CrmModuleListLoading title={title} />;
}
CrmModuleListSnapshot.isCrmListLoading = true;
