"use client";

import { useRouter } from "next/navigation";
import { type MouseEvent } from "react";

/**
 * Кадр последней отрисовки списка. Ссылки — обычный переход по href.
 * Клиентские кнопки (галочки, выгрузка) оживают, когда приезжает RSC.
 */
export function CrmModuleListHtmlFrame({ html }: { html: string }) {
  const router = useRouter();

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    const el = e.target;
    if (!(el instanceof Element)) return;
    const a = el.closest("a[href]");
    if (!(a instanceof HTMLAnchorElement)) return;
    const href = a.getAttribute("href");
    if (!href || !href.startsWith("/") || href.startsWith("//")) return;
    e.preventDefault();
    router.push(href);
  };

  return (
    <div
      className="crm-module-list-html-frame"
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
