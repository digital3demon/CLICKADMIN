"use client";

import { usePathname } from "next/navigation";
import { crmModuleTitleForPath } from "@/lib/crm-module-list-snapshot";
import { CrmModuleTitleLoading } from "@/components/layout/CrmModuleTitleLoading";

/** Заголовок модуля без серых полосок, пока RSC ещё считается. */
export function CrmModuleLoading({ title }: { title?: string }) {
  const pathname = usePathname();
  return (
    <CrmModuleTitleLoading
      title={title ?? crmModuleTitleForPath(pathname ?? "")}
      hint="Загрузка…"
    />
  );
}
