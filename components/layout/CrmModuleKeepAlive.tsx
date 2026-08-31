"use client";

import {
  isValidElement,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { crmModuleListKeepAlivePath } from "@/lib/crm-module-list-snapshot";
import {
  getCrmListAlivePath,
  subscribeCrmListAlive,
} from "@/lib/crm-module-list-alive";
import { CrmModuleListLive } from "@/components/layout/CrmModuleListLive";
import { CrmModuleListLoading } from "@/components/layout/CrmModuleListLoading";
import { CrmModuleListSnapshot } from "@/components/layout/CrmModuleListSnapshot";

type LoadingFlag = { isCrmListLoading?: boolean };

/** Кэш на модуль, не на инстанс AppShell — иначе мягкая навигация обнуляет ref. */
const listPageCache = new Map<string, ReactNode>();

function isCrmModuleListLoading(node: ReactNode, depth = 0): boolean {
  if (depth > 4 || node == null || typeof node === "boolean") return false;
  if (Array.isArray(node)) {
    return node.some((n) => isCrmModuleListLoading(n, depth + 1));
  }
  if (!isValidElement(node)) return false;
  const t = node.type;
  if (t === CrmModuleListLoading || t === CrmModuleListSnapshot) return true;
  if (typeof t === "function" && (t as LoadingFlag).isCrmListLoading) {
    return true;
  }
  return isCrmModuleListLoading(
    (node.props as { children?: ReactNode }).children,
    depth + 1,
  );
}

/**
 * Пока RSC списка считается, на экране прошлый живой ФинОтдел/Заказы.
 * Кэш пишем только когда клиент списка доложил «нарисован» — не из loading.tsx.
 */
export function CrmModuleKeepAlive({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const path = crmModuleListKeepAlivePath(pathname);
  const painted = useSyncExternalStore(
    subscribeCrmListAlive,
    getCrmListAlivePath,
    () => null,
  );
  const loadingUi = isCrmModuleListLoading(children);
  const live = Boolean(path && painted === path && !loadingUi);

  if (path && live) {
    listPageCache.set(path, children);
  }

  if (!path) {
    return <CrmModuleListLive>{children}</CrmModuleListLive>;
  }

  const cached = listPageCache.get(path);
  const showCached = Boolean(cached && !live);

  return (
    <div className="relative">
      {showCached ? (
        <p
          className="pointer-events-none absolute right-3 top-3 z-[50] rounded-full border border-[var(--card-border)] bg-[var(--card-bg)]/90 px-3 py-1 text-sm text-[var(--text-muted)] shadow-sm"
          aria-live="polite"
        >
          Обновляю…
        </p>
      ) : null}
      {Array.from(listPageCache.entries()).map(([p, node]) => {
        const active = p === path;
        return (
          <div
            key={p}
            hidden={!active}
            className={active ? undefined : "hidden"}
            inert={!active ? true : undefined}
          >
            {active && live ? (
              <CrmModuleListLive>{children}</CrmModuleListLive>
            ) : (
              node
            )}
          </div>
        );
      })}
      {!cached ? <CrmModuleListLive>{children}</CrmModuleListLive> : null}
      {showCached ? (
        <div hidden className="hidden" aria-hidden>
          <CrmModuleListLive>{children}</CrmModuleListLive>
        </div>
      ) : null}
    </div>
  );
}
