"use client";

import { useEffect, useLayoutEffect, type ReactNode } from "react";
import {
  DEFAULT_UI_DESIGN,
  isUiDesign,
  readUiDesignFromLocalStorage,
  writeUiDesignToLocalStorage,
  type UiDesign,
} from "@/lib/ui-design";

async function fetchServerUiDesign(): Promise<{
  found: boolean;
  design: UiDesign;
} | null> {
  const res = await fetch("/api/me/ui-design", {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { found?: unknown; design?: unknown };
  const raw =
    typeof j.design === "string" ? j.design : null;
  const design = isUiDesign(raw) ? raw : DEFAULT_UI_DESIGN;
  return { found: j.found === true, design };
}

async function persistUiDesignToServer(design: UiDesign): Promise<void> {
  await fetch("/api/me/ui-design", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ design }),
  });
}

/**
 * Согласование локального выбора и значения из userClientState.
 * GET без записи в БД отдаёт design=classic — это не явный выбор пользователя.
 */
export function resolveEffectiveUiDesign(
  local: UiDesign | null,
  server: { found: boolean; design: UiDesign },
): UiDesign {
  if (!server.found) {
    return local ?? DEFAULT_UI_DESIGN;
  }
  if (local && local !== server.design) {
    return local;
  }
  return server.design;
}

export function UiDesignProvider({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    const local = readUiDesignFromLocalStorage();
    if (local) {
      writeUiDesignToLocalStorage(local);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const server = await fetchServerUiDesign();
        if (cancelled || !server) return;

        const local = readUiDesignFromLocalStorage();
        const effective = resolveEffectiveUiDesign(local, server);
        writeUiDesignToLocalStorage(effective);

        const shouldPushToServer =
          (!server.found && effective !== DEFAULT_UI_DESIGN) ||
          (server.found && local != null && local !== server.design);

        if (shouldPushToServer) {
          void persistUiDesignToServer(effective);
        }
      } catch {
        /* сеть / 401 — оставляем значение из bootstrap и localStorage */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return children;
}
