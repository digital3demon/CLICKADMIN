"use client";

import { saveClientsListReturnUrl } from "@/lib/clients-list-return";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/** Запоминает URL списка (поиск, сортировка, страница) для кнопки «назад» в карточке. */
export function ClientsListReturnSync() {
  const pathname = usePathname();
  const sp = useSearchParams();

  useEffect(() => {
    const q = sp.toString();
    const url = q ? `${pathname}?${q}` : pathname;
    saveClientsListReturnUrl(url);
  }, [pathname, sp]);

  return null;
}
