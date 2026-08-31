"use client";

import { CrmModuleTitleLoading } from "@/components/layout/CrmModuleTitleLoading";

/** Клиентский loading.tsx — тип виден AppShell, в отличие от серверного Loading. */
export function CrmModuleListLoading({ title }: { title: string }) {
  return <CrmModuleTitleLoading title={title} />;
}
CrmModuleListLoading.isCrmListLoading = true;
