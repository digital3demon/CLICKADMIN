"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { CrmModuleTitleLoading } from "@/components/layout/CrmModuleTitleLoading";
import { CrmModuleListHtmlFrame } from "@/components/layout/CrmModuleListHtmlFrame";
import { crmModuleListKeepAlivePath } from "@/lib/crm-module-list-snapshot";
import {
  isCrmModuleListLoadingHtml,
  readCrmModuleListHtml,
} from "@/lib/crm-module-list-html";

function subscribeNoop() {
  return () => {};
}

/** Клиентский loading.tsx — тип виден AppShell, в отличие от серверного Loading. */
export function CrmModuleListLoading({ title }: { title: string }) {
  const pathname = usePathname() ?? "";
  const path = crmModuleListKeepAlivePath(pathname);
  const html = useSyncExternalStore(
    subscribeNoop,
    () => (path ? readCrmModuleListHtml(path) : null),
    () => null,
  );
  if (html && !isCrmModuleListLoadingHtml(html)) {
    return <CrmModuleListHtmlFrame html={html} />;
  }
  return <CrmModuleTitleLoading title={title} />;
}
CrmModuleListLoading.isCrmListLoading = true;
