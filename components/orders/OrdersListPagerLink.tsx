"use client";

import Link from "next/link";
import { useState, type MouseEvent, type ReactNode } from "react";

/**
 * Пагинация списка нарядов: сразу «Загрузка…», пока RSC тянет следующую страницу.
 * Обычный Link без этого выглядит мёртвым — страница тяжёлая.
 */
export function OrdersListPagerLink({
  href,
  children,
  className,
  pendingLabel = "Загрузка…",
}: {
  href: string;
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const [pending, setPending] = useState(false);

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    setPending(true);
  };

  return (
    <Link
      href={href}
      prefetch
      aria-busy={pending}
      aria-disabled={pending}
      onClick={onClick}
      className={[
        className,
        pending ? "pointer-events-none opacity-70" : null,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {pending ? pendingLabel : children}
    </Link>
  );
}
