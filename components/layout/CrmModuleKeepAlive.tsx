"use client";

import {
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
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
 * Кадр прошлого визита — сразу на экране (переключение быстрое).
 * Живое React-дерево монтируем только после idle и только у текущего модуля.
 * Иначе вкладка держит Заказы+ФинОтдел целиком (~×2 RAM).
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
  const htmlSnap = !live && path ? readCrmModuleListHtml(path) : null;
  const [hydratedPath, setHydratedPath] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setHydratedPath(null);
      return;
    }
    if (!readCrmModuleListHtml(path)) {
      setHydratedPath(path);
      return;
    }
    const hydrate = () => setHydratedPath(path);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(hydrate, { timeout: 400 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(hydrate, 200);
    return () => window.clearTimeout(t);
  }, [path]);

  useLayoutEffect(() => {
    if (!live || !path || !liveRootRef.current) return;
    rememberCrmModuleListHtml(path, liveRootRef.current.innerHTML);
  }, [live, path, children]);

  if (!path) {
    return <CrmModuleListLive>{children}</CrmModuleListLive>;
  }

  const mountLive = !htmlSnap || hydratedPath === path;

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
      {mountLive ? (
        <div
          ref={liveRootRef}
          hidden={Boolean(htmlSnap)}
          className={htmlSnap ? "hidden" : undefined}
          inert={htmlSnap ? true : undefined}
        >
          <CrmModuleListLive>{children}</CrmModuleListLive>
        </div>
      ) : null}
    </div>
  );
}
