"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_KANBAN_ADMIN_MENTION_TAG,
  normalizeKanbanAdminMentionTag,
} from "@/lib/kanban-admin-mention";

/** Эффективный токен @… для группы ADMINISTRATOR + SENIOR_ADMINISTRATOR (из настроек организации). */
export function useKanbanAdminMentionTag(): string {
  const [tag, setTag] = useState(DEFAULT_KANBAN_ADMIN_MENTION_TAG);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/session", { credentials: "include", cache: "no-store" })
      .then((res) => res.json())
      .then(
        (j: {
          user?: unknown;
          tenant?: { kanbanAdminMentionTag?: string | null };
        }) => {
          if (cancelled || !j?.user) return;
          setTag(
            normalizeKanbanAdminMentionTag(j.tenant?.kanbanAdminMentionTag ?? null),
          );
        },
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return tag;
}
