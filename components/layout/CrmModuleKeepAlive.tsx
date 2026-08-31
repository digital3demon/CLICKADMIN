"use client";

import {
  isValidElement,
  useRef,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { crmModuleListKeepAlivePath } from "@/lib/crm-module-list-snapshot";
import { CrmModuleListSnapshot } from "@/components/layout/CrmModuleListSnapshot";

type LoadingFlag = { isCrmListLoading?: boolean };

function isCrmModuleListLoading(node: ReactNode, depth = 0): boolean {
  if (depth > 4 || node == null || typeof node === "boolean") return false;
  if (Array.isArray(node)) {
    return node.some((n) => isCrmModuleListLoading(n, depth + 1));
  }
  if (!isValidElement(node)) return false;
  const t = node.type;
  const props = node.props as {
    children?: ReactNode;
    "data-crm-module-list-loading"?: string;
  };
  if (props["data-crm-module-list-loading"]) return true;
  if (t === CrmModuleListSnapshot) return true;
  if (typeof t === "function" && (t as LoadingFlag).isCrmListLoading) {
    return true;
  }
  return isCrmModuleListLoading(props.children, depth + 1);
}

/**
 * ФинОтдел и Заказы не размонтируем при уходе в другой модуль.
 * Пока RSC «Обновляю…», на экране та же живая страница — клики работают.
 */
export function CrmModuleKeepAlive({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const path = crmModuleListKeepAlivePath(pathname);
  const cacheRef = useRef(new Map<string, ReactNode>());
  const loading = isCrmModuleListLoading(children);

  if (path && !loading) {
    cacheRef.current.set(path, children);
  }

  if (!path) {
    return <>{children}</>;
  }

  if (!cacheRef.current.has(path)) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {loading ? (
        <p
          className="pointer-events-none absolute right-3 top-3 z-[50] rounded-full border border-[var(--card-border)] bg-[var(--card-bg)]/90 px-3 py-1 text-sm text-[var(--text-muted)] shadow-sm"
          aria-live="polite"
        >
          Обновляю…
        </p>
      ) : null}
      {Array.from(cacheRef.current.entries()).map(([p, node]) => {
        const active = p === path;
        return (
          <div
            key={p}
            hidden={!active}
            className={active ? undefined : "hidden"}
            inert={!active ? true : undefined}
          >
            {active && !loading ? children : node}
          </div>
        );
      })}
    </div>
  );
}
