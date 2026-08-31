"use client";

import { CrmModuleTitleLoading } from "@/components/layout/CrmModuleTitleLoading";

/** Маркер loading.tsx: keep-alive показывает прошлую живую страницу, иначе только заголовок. */
export function CrmModuleListSnapshot({ title }: { title: string }) {
  return (
    <div data-crm-module-list-loading={title}>
      <CrmModuleTitleLoading title={title} />
    </div>
  );
}
CrmModuleListSnapshot.isCrmListLoading = true;
