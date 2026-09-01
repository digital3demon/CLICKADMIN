"use client";

import {
  isValidElement,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { crmModuleListKeepAlivePath } from "@/lib/crm-module-list-snapshot";
import {
  getCrmListAlivePath,
  subscribeCrmListAlive,
} from "@/lib/crm-module-list-alive";
import {
  readCrmModuleListHtml,
  rememberCrmModuleListHtml,
} from "@/lib/crm-module-list-html";
import { CrmModuleListLive } from "@/components/layout/CrmModuleListLive";
import { CrmModuleListLoading } from "@/components/layout/CrmModuleListLoading";
import { CrmModuleListSnapshot } from "@/components/layout/CrmModuleListSnapshot";
import { CrmModuleListHtmlFrame } from "@/components/layout/CrmModuleListHtmlFrame";

type LoadingFlag = { isCrmListLoading?: boolean };

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
 * Пока RSC списка считается — HTML-кадр прошлого визита этого модуля.
 * Второе React-дерево не держим: Заказы и ФинОтдел сразу ~×2 к памяти вкладки.
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
  const liveRootRef = useRef<HTMLDivElement>(null);
  const htmlSnap =
    !live && path ? readCrmModuleListHtml(path) : null;

  useLayoutEffect(() => {
    if (!live || !path || !liveRootRef.current) return;
    rememberCrmModuleListHtml(path, liveRootRef.current.innerHTML);
  }, [live, path, children]);

  if (!path) {
    return <CrmModuleListLive>{children}</CrmModuleListLive>;
  }

  return (
    <div className="relative">
      {htmlSnap ? (
        <p
          className="pointer-events-none absolute right-3 top-3 z-[50] rounded-full border border-[var(--card-border)] bg-[var(--card-bg)]/90 px-3 py-1 text-sm text-[var(--text-muted)] shadow-sm"
          aria-live="polite"
        >
          Обновляю…
        </p>
      ) : null}
      {htmlSnap ? <CrmModuleListHtmlFrame html={htmlSnap} /> : null}
      <div
        ref={liveRootRef}
        hidden={Boolean(htmlSnap)}
        className={htmlSnap ? "hidden" : undefined}
        inert={htmlSnap ? true : undefined}
      >
        <CrmModuleListLive>{children}</CrmModuleListLive>
      </div>
    </div>
  );
}
